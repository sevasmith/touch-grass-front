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

/** A fixed code, or one chosen by the exact backend message with an optional fallback. */
type Rule =
  | AuthErrorCode
  | { byMessage: ReadonlyMap<string, AuthErrorCode>; otherwise?: AuthErrorCode }

/** Endpoint-specific rows of the error-mapping table; anything else falls through to the common rows. */
const ENDPOINT_RULES: Record<AuthEndpoint, Partial<Record<number, Rule>>> = {
  login: { 401: "INVALID_CREDENTIALS", 429: "TOO_MANY_ATTEMPTS" },
  signup: { 409: "EMAIL_TAKEN" },
  "verify-email": {
    401: { byMessage: VERIFY_CODE_ERRORS, otherwise: "SESSION_EXPIRED" },
    429: "TOO_MANY_ATTEMPTS",
  },
  "resend-verification": {
    429: {
      byMessage: new Map([
        [BACKEND_MESSAGES.resendCooldown, "RESEND_COOLDOWN"],
      ]),
    },
    503: "EMAIL_SEND_FAILED",
  },
  "forgot-password": {},
  "reset-password": {
    401: { byMessage: RESET_ERRORS, otherwise: "RESET_INVALID" },
  },
  "oauth-exchange": { 401: "OAUTH_FAILED", 429: "OAUTH_RATE_LIMITED" },
}

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
  const rule = ENDPOINT_RULES[endpoint][status]
  if (rule === undefined || typeof rule === "string") return rule
  return rule.byMessage.get(message) ?? rule.otherwise
}
