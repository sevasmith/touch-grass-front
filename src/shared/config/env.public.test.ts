import { describe, expect, it } from "vitest"

import { PublicEnvSchema } from "./env.public"

describe("PublicEnvSchema", () => {
  it("requires NEXT_PUBLIC_API_URL to be a URL", () => {
    expect(PublicEnvSchema.safeParse({}).success).toBe(false)
    expect(
      PublicEnvSchema.safeParse({ NEXT_PUBLIC_API_URL: "nope" }).success
    ).toBe(false)
    expect(
      PublicEnvSchema.parse({ NEXT_PUBLIC_API_URL: "http://api.test" })
    ).toEqual({ NEXT_PUBLIC_API_URL: "http://api.test" })
  })
})
