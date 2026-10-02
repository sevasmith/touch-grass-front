// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const env = vi.hoisted(() => ({
  serverEnv: {} as { SESSION_CACHE_KEY?: string },
}))
vi.mock("@/shared/config/env.server", () => env)

const KEY_A = Buffer.alloc(32, 1).toString("base64")
const KEY_B = Buffer.alloc(32, 2).toString("base64")

async function load(key: string | undefined) {
  env.serverEnv = { SESSION_CACHE_KEY: key }
  vi.resetModules()
  return import("./crypto")
}

beforeEach(() => {
  delete (globalThis as Record<string, unknown>).__touchGrassSessionCacheKey
})

const value = {
  kind: "ok",
  pair: { accessToken: "at-1", refreshToken: "rt-1" },
}

describe("encryptJson / decryptJson", () => {
  it("round-trips a JSON value", async () => {
    const { encryptJson, decryptJson } = await load(KEY_A)

    expect(await decryptJson(await encryptJson(value))).toEqual(value)
  })

  it("never contains the plaintext and uses a fresh IV each time", async () => {
    const { encryptJson } = await load(KEY_A)

    const first = await encryptJson(value)
    const second = await encryptJson(value)

    expect(first).not.toBe(second)
    expect(Buffer.from(first, "base64").toString("latin1")).not.toContain(
      "rt-1"
    )
  })

  it("returns null for a tampered ciphertext", async () => {
    const { encryptJson, decryptJson } = await load(KEY_A)
    const bytes = Buffer.from(await encryptJson(value), "base64")
    bytes[bytes.length - 1] ^= 0xff

    expect(await decryptJson(bytes.toString("base64"))).toBeNull()
  })

  it("returns null under the wrong key", async () => {
    const encrypted = await (await load(KEY_A)).encryptJson(value)

    expect(await (await load(KEY_B)).decryptJson(encrypted)).toBeNull()
  })

  it.each(["", "not base64 !!", Buffer.alloc(8).toString("base64")])(
    "returns null for malformed input %j",
    async (input) => {
      const { decryptJson } = await load(KEY_A)
      expect(await decryptJson(input)).toBeNull()
    }
  )

  it("generates one random key per process when SESSION_CACHE_KEY is absent", async () => {
    const encrypted = await (await load(undefined)).encryptJson(value)

    expect(await (await load(undefined)).decryptJson(encrypted)).toEqual(value)
  })
})
