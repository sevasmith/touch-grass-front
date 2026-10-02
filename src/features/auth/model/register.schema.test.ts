import { describe, expect, it } from "vitest"

import { RegisterSchema } from "./register.schema"

const valid = {
  email: "ada@example.com",
  password: "aaaaaaaa",
  confirmPassword: "aaaaaaaa",
}

function fieldMessages(input: unknown) {
  const result = RegisterSchema.safeParse(input)
  return result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((issue) => [issue.path[0], issue.message])
      )
}

describe("RegisterSchema", () => {
  it("accepts a valid registration and trims the email", () => {
    expect(
      RegisterSchema.parse({ ...valid, email: " ada@example.com " })
    ).toEqual(valid)
  })

  it("requires email, password and confirmation", () => {
    expect(
      fieldMessages({ email: "", password: "", confirmPassword: "" })
    ).toEqual({
      email: "Enter your email",
      password: "Password must be 8–72 characters",
      confirmPassword: "Confirm your password",
    })
  })

  it.each([7, 73])("rejects a %i-character password", (length) => {
    const password = "a".repeat(length)
    expect(
      fieldMessages({ ...valid, password, confirmPassword: password })
    ).toEqual({
      password: "Password must be 8–72 characters",
    })
  })

  it.each([8, 72])("accepts a %i-character password", (length) => {
    const password = "a".repeat(length)
    expect(
      RegisterSchema.safeParse({
        ...valid,
        password,
        confirmPassword: password,
      }).success
    ).toBe(true)
  })

  it("puts a mismatch error on confirmPassword", () => {
    expect(fieldMessages({ ...valid, confirmPassword: "bbbbbbbb" })).toEqual({
      confirmPassword: "Passwords don't match",
    })
  })
})
