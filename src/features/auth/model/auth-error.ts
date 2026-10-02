import type { Route } from "next"
import { z } from "zod"

import type { ActionResult } from "@/shared/api/action-result"

/** Every backend outcome maps to exactly one code (SC-005); see contracts/backend-api.md. */
export const AuthErrorCodeSchema = z.enum([
  "INVALID_CREDENTIALS",
  "EMAIL_TAKEN",
  "TOO_MANY_ATTEMPTS",
  "RATE_LIMITED",
  "CODE_INVALID",
  "CODE_EXPIRED",
  "CODE_NONE_ACTIVE",
  "CODE_ATTEMPTS_EXHAUSTED",
  "RESEND_COOLDOWN",
  "EMAIL_SEND_FAILED",
  "OAUTH_ACCESS_DENIED",
  "OAUTH_EMAIL_IN_USE",
  "OAUTH_RATE_LIMITED",
  "OAUTH_FAILED",
  "RESET_INVALID",
  "RESET_EXPIRED",
  "RESET_ALREADY_USED",
  "RESET_REPLACED",
  "RESET_SAME_PASSWORD",
  "SESSION_EXPIRED",
  "EMAIL_NOT_VERIFIED",
  "VALIDATION",
  "NETWORK_ERROR",
  "SERVER_ERROR",
  "UNEXPECTED",
])

export type AuthErrorCode = z.infer<typeof AuthErrorCodeSchema>

/** The only error text users see; raw backend messages are never rendered. */
export const AUTH_ERROR_COPY = {
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
  // Normally handled by redirecting to /verify-email (FR-020); shown only if that is not possible.
  EMAIL_NOT_VERIFIED: "Please verify your email to continue.",
  VALIDATION: "Please check the highlighted fields.",
  NETWORK_ERROR:
    "We couldn't reach Touch Grass. Check your connection and try again.",
  SERVER_ERROR: "Something went wrong on our side. Please try again.",
  UNEXPECTED: "Something went wrong. Please try again.",
} as const satisfies Record<AuthErrorCode, string>

export type AuthActionResult<T extends object = { redirectTo?: Route }> =
  ActionResult<T, AuthErrorCode>
