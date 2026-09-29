import { describe, expect, it } from "vitest"

import { ApiErrorSchema, AuthUserSchema, SessionResponseSchema } from "./schema"

const validUser = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  email: "a@b.com",
  emailVerified: true,
}

describe("AuthUserSchema", () => {
  it("parses a valid user", () => {
    const result = AuthUserSchema.safeParse(validUser)
    expect(result.success).toBe(true)
  })

  it("rejects an invalid uuid", () => {
    const result = AuthUserSchema.safeParse({
      ...validUser,
      id: "not-a-uuid",
    })
    expect(result.success).toBe(false)
  })

  it("rejects a non-email", () => {
    const result = AuthUserSchema.safeParse({
      ...validUser,
      email: "not-an-email",
    })
    expect(result.success).toBe(false)
  })

  it("rejects when emailVerified is missing", () => {
    const withoutEmailVerified = { id: validUser.id, email: validUser.email }
    const result = AuthUserSchema.safeParse(withoutEmailVerified)
    expect(result.success).toBe(false)
  })
})

describe("SessionResponseSchema", () => {
  it("parses a valid session", () => {
    const result = SessionResponseSchema.safeParse({
      token: "tok",
      expiresAt: "2026-09-23T12:00:00Z",
      user: validUser,
    })
    expect(result.success).toBe(true)
  })

  it("rejects a non-datetime expiresAt", () => {
    const result = SessionResponseSchema.safeParse({
      token: "tok",
      expiresAt: "not-a-date",
      user: validUser,
    })
    expect(result.success).toBe(false)
  })

  it("rejects a missing token", () => {
    const result = SessionResponseSchema.safeParse({
      expiresAt: "2026-09-23T12:00:00Z",
      user: validUser,
    })
    expect(result.success).toBe(false)
  })
})

describe("ApiErrorSchema", () => {
  it("parses a message-only error", () => {
    const result = ApiErrorSchema.safeParse({ message: "x" })
    expect(result.success).toBe(true)
  })

  it("parses a full error", () => {
    const result = ApiErrorSchema.safeParse({
      message: "x",
      code: "E",
      fieldErrors: { email: ["bad"] },
    })
    expect(result.success).toBe(true)
  })

  it("rejects when message is not a string", () => {
    const result = ApiErrorSchema.safeParse({ message: 42 })
    expect(result.success).toBe(false)
  })
})
