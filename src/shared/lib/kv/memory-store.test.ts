// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createMemoryStore } from "./memory-store"

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(async () => {
  await createMemoryStore().del("k")
  vi.useRealTimers()
})

describe("createMemoryStore", () => {
  it("returns null for a missing key", async () => {
    expect(await createMemoryStore().get("k")).toBeNull()
  })

  it("setNx succeeds once and then fails while the key is live", async () => {
    const store = createMemoryStore()

    expect(await store.setNx("k", "a", 1000)).toBe(true)
    expect(await store.setNx("k", "b", 1000)).toBe(false)
    expect(await store.get("k")).toBe("a")
  })

  it("expires keys after ttlMs", async () => {
    const store = createMemoryStore()
    await store.setNx("k", "a", 1000)

    vi.advanceTimersByTime(999)
    expect(await store.get("k")).toBe("a")

    vi.advanceTimersByTime(1)
    expect(await store.get("k")).toBeNull()
    expect(await store.setNx("k", "b", 1000)).toBe(true)
  })

  it("set overwrites an existing value and its ttl", async () => {
    const store = createMemoryStore()
    await store.set("k", "a", 1000)
    await store.set("k", "b", 5000)

    vi.advanceTimersByTime(2000)
    expect(await store.get("k")).toBe("b")
  })

  it("del removes a key", async () => {
    const store = createMemoryStore()
    await store.set("k", "a", 1000)

    await store.del("k")

    expect(await store.get("k")).toBeNull()
  })

  it("shares state across module re-imports through globalThis", async () => {
    await createMemoryStore().set("k", "a", 1000)

    vi.resetModules()
    const fresh = await import("./memory-store")

    expect(await fresh.createMemoryStore().get("k")).toBe("a")
  })
})
