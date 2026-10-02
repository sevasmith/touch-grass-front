import { describe, expect, it } from "vitest"

import { AUTH_ERROR_COPY, AuthErrorCodeSchema } from "./auth-error"

// "User-facing copy" column of specs/001-auth-login-signup/contracts/backend-api.md.
const EXPECTED_COPY = {
  INVALID_CREDENTIALS: "Invalid email or password",
  EMAIL_TAKEN: "This email is already registered. Log in instead?",
  TOO_MANY_ATTEMPTS: "Too many attempts, please wait a moment",
  RATE_LIMITED: "Too many requests, please try again later",
  CODE_INVALID: "Invalid verification code. That used one of your 5 attempts.",
  CODE_EXPIRED: "Verification code expired. Request a new code below.",
  CODE_NONE_ACTIVE: "No valid code. Please request a new one.",
  CODE_ATTEMPTS_EXHAUSTED:
    "Too many attempts, please request a new verification code",
  RESEND_COOLDOWN: "Please wait a moment before requesting another code",
  EMAIL_SEND_FAILED: "Unable to send the verification email, try again later",
  OAUTH_ACCESS_DENIED: "Google sign-in was cancelled or not permitted",
  OAUTH_EMAIL_IN_USE:
    "This email already belongs to an account that isn't verified yet. Log in with your password and verify your email first, then you can use Google.",
  OAUTH_RATE_LIMITED:
    "Too many sign-in attempts. Please wait a moment and try again.",
  OAUTH_FAILED: "Google sign-in failed, please try again",
  RESET_INVALID: "This reset link is invalid. Request a new one.",
  RESET_EXPIRED: "This reset link has expired. Request a new one.",
  RESET_ALREADY_USED:
    "This reset link was already used. For your security you've been signed out everywhere.",
  RESET_REPLACED:
    "This reset link has been replaced by a newer request. Check your most recent email.",
  RESET_SAME_PASSWORD:
    "New password must be different from your current password",
  SESSION_EXPIRED: "Your session has ended. Please log in again.",
  VALIDATION: "Please check the highlighted fields.",
  NETWORK_ERROR:
    "We couldn't reach Touch Grass. Check your connection and try again.",
  SERVER_ERROR: "Something went wrong on our side. Please try again.",
  UNEXPECTED: "Something went wrong. Please try again.",
} as const

describe("AuthErrorCodeSchema", () => {
  it("contains exactly the 25 codes of data-model §4", () => {
    expect([...AuthErrorCodeSchema.options].sort()).toEqual(
      [...Object.keys(EXPECTED_COPY), "EMAIL_NOT_VERIFIED"].sort()
    )
    expect(AuthErrorCodeSchema.options).toHaveLength(25)
  })
})

describe("AUTH_ERROR_COPY", () => {
  it("has non-empty copy for every code", () => {
    for (const code of AuthErrorCodeSchema.options) {
      expect(AUTH_ERROR_COPY[code].trim()).not.toBe("")
    }
  })

  it.each(Object.entries(EXPECTED_COPY))(
    "%s matches the contract copy",
    (code, copy) => {
      expect(AUTH_ERROR_COPY[code as keyof typeof EXPECTED_COPY]).toBe(copy)
    }
  )
})
