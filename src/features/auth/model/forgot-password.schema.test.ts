import { describe, expect, it } from "vitest"

import {
  ForgotPasswordResponseSchema,
  ForgotPasswordSchema,
} from "./forgot-password.schema"

describe("ForgotPasswordSchema", () => {
  it("trims a valid email", () => {
    expect(ForgotPasswordSchema.parse({ email: " ada@example.com " })).toEqual({
      email: "ada@example.com",
    })
  })

  it.each(["", "ada"])("rejects %j", (email) => {
    expect(ForgotPasswordSchema.safeParse({ email }).success).toBe(false)
  })
})

describe("ForgotPasswordResponseSchema", () => {
  it("requires { message: string }", () => {
    expect(
      ForgotPasswordResponseSchema.safeParse({ message: "ok" }).success
    ).toBe(true)
    expect(ForgotPasswordResponseSchema.safeParse({}).success).toBe(false)
    expect(ForgotPasswordResponseSchema.safeParse({ message: 1 }).success).toBe(
      false
    )
  })
})
