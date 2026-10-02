import { describe, expect, it } from "vitest"
import { z } from "zod"

import {
  EmailSchema,
  NewPasswordSchema,
  withPasswordConfirmation,
} from "./fields"

function messages(result: z.ZodSafeParseResult<unknown>) {
  return result.success ? [] : result.error.issues.map((issue) => issue.message)
}

describe("EmailSchema", () => {
  it("trims the address", () => {
    expect(EmailSchema.parse("  ada@example.com ")).toBe("ada@example.com")
  })

  it.each(["", "   "])("requires a value (%j)", (value) => {
    expect(messages(EmailSchema.safeParse(value))).toEqual(["Enter your email"])
  })

  it.each(["ada", "ada@", "@example.com", "ada@example"])(
    "rejects %j",
    (value) => {
      expect(messages(EmailSchema.safeParse(value))).toEqual([
        "Enter a valid email address",
      ])
    }
  )
})

describe("NewPasswordSchema", () => {
  it.each([7, 73])("rejects %i characters", (length) => {
    expect(messages(NewPasswordSchema.safeParse("a".repeat(length)))).toEqual([
      "Password must be 8–72 characters",
    ])
  })

  it.each([8, 72])("accepts %i characters", (length) => {
    expect(NewPasswordSchema.safeParse("a".repeat(length)).success).toBe(true)
  })

  it("has no composition rules (FR-032)", () => {
    expect(NewPasswordSchema.safeParse("aaaaaaaa").success).toBe(true)
  })
})

describe("withPasswordConfirmation", () => {
  const Schema = withPasswordConfirmation(
    z.object({
      email: EmailSchema,
      password: NewPasswordSchema,
      confirmPassword: z.string(),
    })
  )
  const valid = {
    email: "ada@example.com",
    password: "aaaaaaaa",
    confirmPassword: "aaaaaaaa",
  }

  it("accepts matching passwords", () => {
    expect(Schema.safeParse(valid).success).toBe(true)
  })

  it("puts a mismatch error on confirmPassword", () => {
    const result = Schema.safeParse({ ...valid, confirmPassword: "bbbbbbbb" })

    expect(result.success).toBe(false)
    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        path: ["confirmPassword"],
        message: "Passwords don't match",
      }),
    ])
  })

  it("still reports the mismatch when another field is invalid", () => {
    const result = Schema.safeParse({
      ...valid,
      email: "",
      confirmPassword: "b",
    })

    expect(result.error?.issues.map((issue) => issue.path)).toEqual([
      ["email"],
      ["confirmPassword"],
    ])
  })
})
