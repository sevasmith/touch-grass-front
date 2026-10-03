import { describe, expect, it } from "vitest"

import {
  parseResetPasswordParams,
  ResetPasswordSchema,
} from "./reset-password.schema"

const valid = {
  token: "t0k3n",
  password: "aaaaaaaa",
  confirmPassword: "aaaaaaaa",
}

function fieldMessages(input: unknown) {
  const result = ResetPasswordSchema.safeParse(input)
  return result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((issue) => [issue.path[0], issue.message])
      )
}

describe("ResetPasswordSchema", () => {
  it("accepts a token and a matching 8–72 character password", () => {
    expect(ResetPasswordSchema.parse(valid)).toEqual(valid)
  })

  it("requires a non-empty token", () => {
    expect(Object.keys(fieldMessages({ ...valid, token: "" }))).toEqual([
      "token",
    ])
  })

  it.each([7, 73])("rejects a %i-character password", (length) => {
    const password = "a".repeat(length)
    expect(
      fieldMessages({ ...valid, password, confirmPassword: password })
    ).toEqual({
      password: "Password must be 8–72 characters",
    })
  })

  it("puts a mismatch on confirmPassword", () => {
    expect(fieldMessages({ ...valid, confirmPassword: "bbbbbbbb" })).toEqual({
      confirmPassword: "Passwords don't match",
    })
  })
})

describe("parseResetPasswordParams", () => {
  it("returns the token", () => {
    expect(parseResetPasswordParams({ token: "abc" })).toEqual({ token: "abc" })
  })

  it.each<[string, Record<string, string | string[] | undefined>]>([
    ["no token", {}],
    ["an empty token", { token: "" }],
    ["an array value", { token: ["a", "b"] }],
  ])("returns no token for %s", (_, params) => {
    expect(parseResetPasswordParams(params)).toEqual({ token: undefined })
  })
})
