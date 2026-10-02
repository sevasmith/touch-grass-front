// @vitest-environment node
import { createHash } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { KvError, type KeyValueStore } from "@/shared/lib/kv"
import { createMemoryStore } from "@/shared/lib/kv/memory-store"
import { json, mockFetch } from "@/test/fetch.mock"
import { resetNextHeaders } from "@/test/next-headers.mock"

import { decryptJson, encryptJson } from "./crypto"
import { refreshSession } from "./refresh-coordinator"

vi.mock("next/headers", () => import("@/test/next-headers.mock"))

const OLD_RT = "rt-1"
const pair = { accessToken: "at-2", refreshToken: "rt-2" }
const hash = createHash("sha256").update(OLD_RT).digest("hex")
const LOCK = `rt:lock:${hash}`
const RESULT = `rt:result:${hash}`
const unauthorized = {
  statusCode: 401,
  message: "Refresh token already used",
  error: "Unauthorized",
}

let store: KeyValueStore

/** Records every write so tests can check what reaches the store. */
function recording(inner: KeyValueStore) {
  const writes: { op: string; key: string; value?: string; ttlMs?: number }[] =
    []
  const wrapped: KeyValueStore = {
    get: (key) => inner.get(key),
    async setNx(key, value, ttlMs) {
      writes.push({ op: "setNx", key, value, ttlMs })
      return inner.setNx(key, value, ttlMs)
    },
    async set(key, value, ttlMs) {
      writes.push({ op: "set", key, value, ttlMs })
      return inner.set(key, value, ttlMs)
    },
    async del(key) {
      writes.push({ op: "del", key })
      return inner.del(key)
    },
  }
  return { store: wrapped, writes }
}

/** Virtual time: each sleep advances the clock and yields one macrotask. */
function virtualClock() {
  let t = 0
  return {
    now: () => t,
    sleep: (ms: number) => {
      t += ms
      return new Promise<void>((resolve) => setImmediate(resolve))
    },
  }
}

const later = (ms: number, fn: () => Promise<unknown>) =>
  new Promise<void>((resolve) =>
    setTimeout(() => void fn().then(() => resolve()), ms)
  )

beforeEach(() => {
  delete (globalThis as Record<string, unknown>).__touchGrassMemoryKv
  store = createMemoryStore()
  resetNextHeaders()
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
})

describe("refreshSession — winner", () => {
  it("on 200 caches the encrypted ok outcome under rt:result:{sha256} for 30 s and returns it", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    const api = mockFetch({ "POST /auth/refresh": json(200, pair) })
    const rec = recording(store)

    const outcome = await refreshSession(OLD_RT, { store: rec.store })

    expect(outcome).toEqual({ kind: "ok", pair })
    expect(api.calls("POST /auth/refresh")).toHaveLength(1)
    expect(rec.writes).toContainEqual(
      expect.objectContaining({ op: "setNx", key: LOCK, ttlMs: 10_000 })
    )
    expect(rec.writes).toContainEqual(
      expect.objectContaining({ op: "set", key: RESULT, ttlMs: 30_000 })
    )
    expect(await decryptJson((await store.get(RESULT))!)).toEqual({
      kind: "ok",
      pair,
    })

    vi.setSystemTime(Date.now() + 30_000)
    expect(await store.get(RESULT)).toBeNull()
  })

  it("on 401 caches revoked and returns it", async () => {
    mockFetch({ "POST /auth/refresh": json(401, unauthorized) })

    expect(await refreshSession(OLD_RT, { store })).toEqual({ kind: "revoked" })
    expect(await decryptJson((await store.get(RESULT))!)).toEqual({
      kind: "revoked",
    })
  })

  it.each([
    ["a network failure", new TypeError("fetch failed")],
    ["a 5xx", json(503)],
    ["a 429", json(429)],
  ])(
    "on %s releases the lock, caches nothing and returns transient",
    async (_, response) => {
      const api = mockFetch({ "POST /auth/refresh": response })

      expect(await refreshSession(OLD_RT, { store })).toEqual({
        kind: "transient",
      })
      expect(await store.get(LOCK)).toBeNull()
      expect(await store.get(RESULT)).toBeNull()

      // The refresh token may still be valid, so the next attempt calls the backend again.
      await refreshSession(OLD_RT, { store })
      expect(api.calls("POST /auth/refresh")).toHaveLength(2)
    }
  )

  it("still returns the new pair when caching the result fails", async () => {
    mockFetch({ "POST /auth/refresh": json(200, pair) })
    const failingSet: KeyValueStore = {
      get: (key) => store.get(key),
      setNx: (key, value, ttlMs) => store.setNx(key, value, ttlMs),
      del: (key) => store.del(key),
      set: () => Promise.reject(new KvError("down")),
    }

    expect(await refreshSession(OLD_RT, { store: failingSet })).toEqual({
      kind: "ok",
      pair,
    })
  })
})

describe("refreshSession — single flight (SC-006)", () => {
  it("5 concurrent calls with the same token make exactly one backend call and share the pair", async () => {
    const api = mockFetch({ "POST /auth/refresh": json(200, pair) })

    const outcomes = await Promise.all(
      Array.from({ length: 5 }, () => refreshSession(OLD_RT, { store }))
    )

    expect(api.calls("POST /auth/refresh")).toHaveLength(1)
    for (const outcome of outcomes)
      expect(outcome).toEqual({ kind: "ok", pair })
  })

  it("a laggard call after rotation gets the cached pair with no backend call", async () => {
    const api = mockFetch({ "POST /auth/refresh": json(200, pair) })
    await refreshSession(OLD_RT, { store })

    expect(await refreshSession(OLD_RT, { store })).toEqual({
      kind: "ok",
      pair,
    })
    expect(api.calls("POST /auth/refresh")).toHaveLength(1)
  })

  it("a laggard after a revoked refresh gets revoked with no backend call", async () => {
    const api = mockFetch({ "POST /auth/refresh": json(401, unauthorized) })
    await refreshSession(OLD_RT, { store })

    expect(await refreshSession(OLD_RT, { store })).toEqual({ kind: "revoked" })
    expect(api.calls("POST /auth/refresh")).toHaveLength(1)
  })
})

describe("refreshSession — loser", () => {
  it("polls until another instance's result appears", async () => {
    const api = mockFetch({ "POST /auth/refresh": json(200, pair) })
    await store.setNx(LOCK, "other-instance", 10_000)

    const [outcome] = await Promise.all([
      refreshSession(OLD_RT, { store }),
      later(150, async () =>
        store.set(RESULT, await encryptJson({ kind: "ok", pair }), 30_000)
      ),
    ])

    expect(outcome).toEqual({ kind: "ok", pair })
    expect(api.calls("POST /auth/refresh")).toHaveLength(0)
  })

  it("retries acquiring the lock once when it vanishes without a result", async () => {
    const api = mockFetch({ "POST /auth/refresh": json(200, pair) })
    await store.setNx(LOCK, "other-instance", 10_000)

    const [outcome] = await Promise.all([
      refreshSession(OLD_RT, { store }),
      later(150, () => store.del(LOCK)),
    ])

    expect(outcome).toEqual({ kind: "ok", pair })
    expect(api.calls("POST /auth/refresh")).toHaveLength(1)
  })

  it("times out after 4 s with transient and no backend call", async () => {
    const api = mockFetch({ "POST /auth/refresh": json(200, pair) })
    await store.setNx(LOCK, "other-instance", 10_000)
    const clock = virtualClock()
    const sleep = vi.fn(clock.sleep)

    const outcome = await refreshSession(OLD_RT, {
      store,
      now: clock.now,
      sleep,
    })

    expect(outcome).toEqual({ kind: "transient" })
    expect(api.calls("POST /auth/refresh")).toHaveLength(0)
    expect(sleep).toHaveBeenCalledWith(100)
    expect(clock.now()).toBe(4_000)
  })
})

describe("refreshSession — store failures", () => {
  it.each(["get", "setNx"] as const)(
    "returns transient when %s throws KvError",
    async (op) => {
      const api = mockFetch({ "POST /auth/refresh": json(200, pair) })
      const broken: KeyValueStore = {
        get: (key) => store.get(key),
        setNx: (key, value, ttlMs) => store.setNx(key, value, ttlMs),
        set: (key, value, ttlMs) => store.set(key, value, ttlMs),
        del: (key) => store.del(key),
        [op]: () => Promise.reject(new KvError("down")),
      }

      expect(await refreshSession(OLD_RT, { store: broken })).toEqual({
        kind: "transient",
      })
      expect(api.calls("POST /auth/refresh")).toHaveLength(0)
    }
  )

  it("returns transient for a cached result it cannot decrypt, without calling the backend", async () => {
    const api = mockFetch({ "POST /auth/refresh": json(200, pair) })
    await store.set(RESULT, "garbage", 30_000)

    expect(await refreshSession(OLD_RT, { store })).toEqual({
      kind: "transient",
    })
    expect(api.calls("POST /auth/refresh")).toHaveLength(0)
  })
})

describe("refreshSession — secrecy", () => {
  it("never writes a plaintext token into a key or value", async () => {
    mockFetch({ "POST /auth/refresh": json(200, pair) })
    const rec = recording(store)

    await refreshSession(OLD_RT, { store: rec.store })

    const written = JSON.stringify(rec.writes)
    for (const token of [OLD_RT, pair.accessToken, pair.refreshToken]) {
      expect(written).not.toContain(token)
    }
  })
})
