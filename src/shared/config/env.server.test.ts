import { describe, expect, it } from "vitest"

import { ServerEnvSchema } from "./env.server"

const KEY_32 = Buffer.alloc(32, 7).toString("base64")
const KEY_16 = Buffer.alloc(16, 7).toString("base64")

const base = { NEXT_PUBLIC_API_URL: "http://api.test" }
const upstash = {
  UPSTASH_REDIS_REST_URL: "https://eu1-x.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "upstash-token",
}
const onVercel = { VERCEL: "1" }
const building = { VERCEL: "1", NEXT_PHASE: "phase-production-build" }

describe("ServerEnvSchema", () => {
  it("requires NEXT_PUBLIC_API_URL to be a URL", () => {
    expect(ServerEnvSchema.safeParse({}).success).toBe(false)
    expect(
      ServerEnvSchema.safeParse({ NEXT_PUBLIC_API_URL: "not a url" }).success
    ).toBe(false)
    expect(ServerEnvSchema.safeParse(base).success).toBe(true)
  })

  it("coerces SESSION_COOKIE_MAX_AGE to an int and defaults it to 30 days", () => {
    expect(ServerEnvSchema.parse(base).SESSION_COOKIE_MAX_AGE).toBe(2592000)
    expect(
      ServerEnvSchema.parse({ ...base, SESSION_COOKIE_MAX_AGE: "3600" })
        .SESSION_COOKIE_MAX_AGE
    ).toBe(3600)
    expect(
      ServerEnvSchema.safeParse({ ...base, SESSION_COOKIE_MAX_AGE: "1.5" })
        .success
    ).toBe(false)
  })

  describe("on a Vercel deployment", () => {
    const full = { ...base, ...onVercel, ...upstash, SESSION_CACHE_KEY: KEY_32 }

    it("accepts the full set of coordinator secrets", () => {
      expect(ServerEnvSchema.safeParse(full).success).toBe(true)
    })

    it.each([
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
      "SESSION_CACHE_KEY",
    ] as const)("fails when %s is missing", (name) => {
      const env: Record<string, string> = { ...full }
      delete env[name]
      expect(ServerEnvSchema.safeParse(env).success).toBe(false)
    })

    it("treats an empty value as missing", () => {
      expect(
        ServerEnvSchema.safeParse({ ...full, SESSION_CACHE_KEY: "" }).success
      ).toBe(false)
    })
  })

  describe("during next build and off Vercel", () => {
    it("does not require the coordinator secrets during next build", () => {
      expect(
        ServerEnvSchema.safeParse({
          ...base,
          ...building,
          NODE_ENV: "production",
        }).success
      ).toBe(true)
    })

    it("does not require the coordinator secrets off Vercel, even in production", () => {
      expect(
        ServerEnvSchema.safeParse({ ...base, NODE_ENV: "production" }).success
      ).toBe(true)
    })
  })

  it.each([
    { UPSTASH_REDIS_REST_URL: upstash.UPSTASH_REDIS_REST_URL },
    { UPSTASH_REDIS_REST_TOKEN: upstash.UPSTASH_REDIS_REST_TOKEN },
  ])("fails when only one Upstash variable is set (%o)", (partial) => {
    expect(ServerEnvSchema.safeParse({ ...base, ...partial }).success).toBe(
      false
    )
  })

  it("requires SESSION_CACHE_KEY, when present, to decode to exactly 32 bytes", () => {
    expect(
      ServerEnvSchema.safeParse({ ...base, SESSION_CACHE_KEY: KEY_32 }).success
    ).toBe(true)
    expect(
      ServerEnvSchema.safeParse({ ...base, SESSION_CACHE_KEY: KEY_16 }).success
    ).toBe(false)
    expect(
      ServerEnvSchema.safeParse({
        ...base,
        SESSION_CACHE_KEY: "%%%not-base64%%%",
      }).success
    ).toBe(false)
  })
})
