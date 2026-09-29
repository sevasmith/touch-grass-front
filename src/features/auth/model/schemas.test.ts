import { describe, expect, it } from "vitest"

import {
  ForgotPasswordSchema,
  LoginSchema,
  RegisterSchema,
  ResetPasswordSchema,
} from "./schemas"

describe("LoginSchema", () => {
  it("parses valid input and normalizes email", () => {
    const result = LoginSchema.safeParse({
      email: "  User@Example.COM ",
      password: "x",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe("user@example.com")
    }
  })

  it("rejects an empty password", () => {
    const result = LoginSchema.safeParse({
      email: "user@example.com",
      password: "",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1)
      expect(result.error.issues[0].path).toEqual(["password"])
      expect(result.error.issues[0].message).toBe("Password is required")
    }
  })

  it("rejects an invalid email", () => {
    const result = LoginSchema.safeParse({
      email: "not-an-email",
      password: "x",
    })

    expect(result.success).toBe(false)
  })
})

describe("RegisterSchema", () => {
  it("parses valid input and normalizes email", () => {
    const result = RegisterSchema.safeParse({
      email: "  User@Example.COM ",
      password: "password123",
      confirmPassword: "password123",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe("user@example.com")
    }
  })

  it("rejects a 7-character password", () => {
    const result = RegisterSchema.safeParse({
      email: "user@example.com",
      password: "1234567",
      confirmPassword: "1234567",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) => issue.message === "Password must be at least 8 characters"
        )
      ).toBe(true)
    }
  })

  it("rejects mismatched passwords on the confirmPassword path", () => {
    const result = RegisterSchema.safeParse({
      email: "user@example.com",
      password: "password123",
      confirmPassword: "different",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1)
      expect(result.error.issues[0].path).toEqual(["confirmPassword"])
      expect(result.error.issues[0].message).toBe("Passwords do not match")
    }
  })
})

describe("ForgotPasswordSchema", () => {
  it("parses valid input and normalizes email", () => {
    const result = ForgotPasswordSchema.safeParse({
      email: "  User@Example.COM ",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe("user@example.com")
    }
  })

  it("rejects an invalid email", () => {
    const result = ForgotPasswordSchema.safeParse({
      email: "not-an-email",
    })

    expect(result.success).toBe(false)
  })
})

describe("ResetPasswordSchema", () => {
  it("parses valid input", () => {
    const result = ResetPasswordSchema.safeParse({
      password: "password123",
      confirmPassword: "password123",
      token: "reset-token",
    })

    expect(result.success).toBe(true)
  })

  it("rejects an empty token", () => {
    const result = ResetPasswordSchema.safeParse({
      password: "password123",
      confirmPassword: "password123",
      token: "",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1)
      expect(result.error.issues[0].path).toEqual(["token"])
      expect(result.error.issues[0].message).toBe("Reset token is required")
    }
  })

  it("rejects mismatched passwords on the confirmPassword path", () => {
    const result = ResetPasswordSchema.safeParse({
      password: "password123",
      confirmPassword: "different",
      token: "reset-token",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1)
      expect(result.error.issues[0].path).toEqual(["confirmPassword"])
      expect(result.error.issues[0].message).toBe("Passwords do not match")
    }
  })
})
