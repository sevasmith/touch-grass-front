import { describe, expect, it } from "vitest"

import { LoginSchema } from "./login.schema"

describe("LoginSchema", () => {
  it("trims the email and keeps the password as typed", () => {
    expect(
      LoginSchema.parse({ email: " ada@example.com ", password: " pw " })
    ).toEqual({
      email: "ada@example.com",
      password: " pw ",
    })
  })

  it("requires a valid email", () => {
    expect(LoginSchema.safeParse({ email: "", password: "pw" }).success).toBe(
      false
    )
    expect(
      LoginSchema.safeParse({ email: "ada", password: "pw" }).success
    ).toBe(false)
  })

  it("requires a non-empty password", () => {
    const result = LoginSchema.safeParse({
      email: "ada@example.com",
      password: "",
    })

    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        path: ["password"],
        message: "Enter your password",
      }),
    ])
  })

  it("has no length rule on the password (legacy or long passwords still reach the backend)", () => {
    for (const password of ["a", "a".repeat(200)]) {
      expect(
        LoginSchema.safeParse({ email: "ada@example.com", password }).success
      ).toBe(true)
    }
  })
})
