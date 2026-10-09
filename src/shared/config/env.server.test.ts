import { describe, expect, it } from "vitest"

import { ServerEnvSchema } from "./env.server"

const KEY_32 = Buffer.alloc(32, 7).toString("base64")
const KEY_16 = Buffer.alloc(16, 7).toString("base64")

const base = { NEXT_PUBLIC_API_URL: "http://api.test" }
const upstash = {
  UPSTASH_REDIS_REST_URL: "https://eu1-x.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "upstash-token",
}

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

  describe("coordinator secrets are optional everywhere", () => {
    // The backend's 20-second refresh replay window makes a shared store unnecessary (research R2).
    it("does not require them on a Vercel deployment", () => {
      expect(
        ServerEnvSchema.safeParse({
          ...base,
          VERCEL: "1",
          NODE_ENV: "production",
        }).success
      ).toBe(true)
    })

    it("does not require them off Vercel, even in production", () => {
      expect(
        ServerEnvSchema.safeParse({ ...base, NODE_ENV: "production" }).success
      ).toBe(true)
    })

    it("accepts the full set when it is given", () => {
      expect(
        ServerEnvSchema.safeParse({
          ...base,
          ...upstash,
          SESSION_CACHE_KEY: KEY_32,
        }).success
      ).toBe(true)
    })

    it("treats an empty value as unset", () => {
      const env = ServerEnvSchema.parse({
        ...base,
        UPSTASH_REDIS_REST_URL: "",
        UPSTASH_REDIS_REST_TOKEN: "",
        SESSION_CACHE_KEY: "",
      })
      expect(env.UPSTASH_REDIS_REST_URL).toBeUndefined()
      expect(env.UPSTASH_REDIS_REST_TOKEN).toBeUndefined()
      expect(env.SESSION_CACHE_KEY).toBeUndefined()
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

  it("requires SESSION_CACHE_KEY when Upstash is set, so every instance shares one key", () => {
    expect(ServerEnvSchema.safeParse({ ...base, ...upstash }).success).toBe(
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
