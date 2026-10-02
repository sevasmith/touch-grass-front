// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const env = vi.hoisted(() => ({
  serverEnv: {} as {
    UPSTASH_REDIS_REST_URL?: string
    UPSTASH_REDIS_REST_TOKEN?: string
  },
}))
const upstash = vi.hoisted(() => ({
  createUpstashStore: vi.fn(() => ({ kind: "upstash" })),
}))
const memory = vi.hoisted(() => ({
  createMemoryStore: vi.fn(() => ({ kind: "memory" })),
}))

vi.mock("@/shared/config/env.server", () => env)
vi.mock("./upstash-store", () => upstash)
vi.mock("./memory-store", () => memory)

async function load() {
  vi.resetModules()
  return (await import("./get-kv-store")).getKvStore
}

beforeEach(() => {
  delete (globalThis as Record<string, unknown>).__touchGrassKvStore
  env.serverEnv = {}
})

describe("getKvStore", () => {
  it("returns the Upstash store when both Upstash variables are set", async () => {
    env.serverEnv = {
      UPSTASH_REDIS_REST_URL: "https://eu1-x.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "upstash-token",
    }
    const getKvStore = await load()

    expect(getKvStore()).toEqual({ kind: "upstash" })
    expect(upstash.createUpstashStore).toHaveBeenCalledWith({
      url: "https://eu1-x.upstash.io",
      token: "upstash-token",
    })
    expect(memory.createMemoryStore).not.toHaveBeenCalled()
  })

  it("returns the memory store otherwise", async () => {
    const getKvStore = await load()

    expect(getKvStore()).toEqual({ kind: "memory" })
    expect(upstash.createUpstashStore).not.toHaveBeenCalled()
  })

  it("memoizes the store on globalThis across calls and module reloads", async () => {
    const first = (await load())()
    const second = (await load())()

    expect(second).toBe(first)
    expect(memory.createMemoryStore).toHaveBeenCalledTimes(1)
  })
})
