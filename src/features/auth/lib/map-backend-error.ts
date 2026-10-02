import type { AuthedResult } from "@/entities/session"

import type { AuthErrorCode } from "../model/auth-error"

// Backend messages, copied verbatim from docs/backend-readme.md and matched exactly.
export const BACKEND_MESSAGES = {
  codeInvalid: "Invalid verification code",
  codeExpired: "Verification code expired",
  codeNoneActive: "Invalid or expired verification code",
  codeAttemptsExhausted:
    "Too many attempts, please request a new verification code",
  resendCooldown: "Please wait a moment before requesting another code",
  resetInvalid: "Invalid reset token",
  resetExpired: "Reset token expired",
  resetAlreadyUsed: "Reset token already used",
  resetReplaced: "This reset link has been replaced by a newer request",
  resetSamePassword:
    "New password must be different from your current password",
} as const

const VERIFY_CODE_ERRORS = new Map<string, AuthErrorCode>([
  [BACKEND_MESSAGES.codeInvalid, "CODE_INVALID"],
  [BACKEND_MESSAGES.codeExpired, "CODE_EXPIRED"],
  [BACKEND_MESSAGES.codeNoneActive, "CODE_NONE_ACTIVE"],
  [BACKEND_MESSAGES.codeAttemptsExhausted, "CODE_ATTEMPTS_EXHAUSTED"],
])

const RESET_ERRORS = new Map<string, AuthErrorCode>([
  [BACKEND_MESSAGES.resetInvalid, "RESET_INVALID"],
  [BACKEND_MESSAGES.resetExpired, "RESET_EXPIRED"],
  [BACKEND_MESSAGES.resetAlreadyUsed, "RESET_ALREADY_USED"],
  [BACKEND_MESSAGES.resetReplaced, "RESET_REPLACED"],
  [BACKEND_MESSAGES.resetSamePassword, "RESET_SAME_PASSWORD"],
])

export type AuthEndpoint =
  | "login"
  | "signup"
  | "verify-email"
  | "resend-verification"
  | "forgot-password"
  | "reset-password"
  | "oauth-exchange"

export type BackendFailure = Extract<AuthedResult<unknown>, { ok: false }>

/** True only for the four verification-code 401s, which must never be refreshed and retried. */
export function isVerifyCodeError(message: string | string[]): boolean {
  return typeof message === "string" && VERIFY_CODE_ERRORS.has(message)
}

/** Maps a failed backend call to its `AuthErrorCode` (contracts/backend-api.md, Error mapping). */
export function mapBackendError(
  endpoint: AuthEndpoint,
  result: BackendFailure
): AuthErrorCode {
  switch (result.kind) {
    case "network":
      return "NETWORK_ERROR"
    case "invalid_response":
      return "UNEXPECTED"
    case "session_expired":
      return "SESSION_EXPIRED"
    case "email_not_verified":
      return "EMAIL_NOT_VERIFIED"
  }

  const { status } = result
  const message =
    typeof result.error.message === "string" ? result.error.message : ""

  if (status === 400) return "VALIDATION"
  const specific = mapEndpointStatus(endpoint, status, message)
  if (specific) return specific
  if (status === 429) return "RATE_LIMITED"
  if (status >= 500) return "SERVER_ERROR"
  return "UNEXPECTED"
}

function mapEndpointStatus(
  endpoint: AuthEndpoint,
  status: number,
  message: string
): AuthErrorCode | undefined {
  switch (endpoint) {
    case "login":
      if (status === 401) return "INVALID_CREDENTIALS"
      if (status === 429) return "TOO_MANY_ATTEMPTS"
      return undefined
    case "signup":
      return status === 409 ? "EMAIL_TAKEN" : undefined
    case "verify-email":
      if (status === 401)
        return VERIFY_CODE_ERRORS.get(message) ?? "SESSION_EXPIRED"
      if (status === 429) return "TOO_MANY_ATTEMPTS"
      return undefined
    case "resend-verification":
      if (status === 429 && message === BACKEND_MESSAGES.resendCooldown)
        return "RESEND_COOLDOWN"
      if (status === 503) return "EMAIL_SEND_FAILED"
      return undefined
    case "reset-password":
      return status === 401
        ? (RESET_ERRORS.get(message) ?? "RESET_INVALID")
        : undefined
    case "oauth-exchange":
      if (status === 401) return "OAUTH_FAILED"
      if (status === 429) return "OAUTH_RATE_LIMITED"
      return undefined
    case "forgot-password":
      return undefined
  }
}
