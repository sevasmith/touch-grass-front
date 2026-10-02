import { describe, expect, it } from "vitest"

import {
  isVerifyCodeError,
  mapBackendError,
  type AuthEndpoint,
  type BackendFailure,
} from "./map-backend-error"

function http(status: number, message: string | string[] = ""): BackendFailure {
  return {
    ok: false,
    kind: "http",
    status,
    error: { statusCode: status, message, error: "Error" },
  }
}

const ALL_ENDPOINTS: AuthEndpoint[] = [
  "login",
  "signup",
  "verify-email",
  "resend-verification",
  "forgot-password",
  "reset-password",
  "oauth-exchange",
]

// One case per row of the error-mapping table in contracts/backend-api.md.
describe("mapBackendError — endpoint rows", () => {
  it.each([
    ["login", http(401, "Invalid credentials"), "INVALID_CREDENTIALS"],
    ["login", http(429), "TOO_MANY_ATTEMPTS"],
    ["signup", http(409, "Email already registered"), "EMAIL_TAKEN"],
    ["verify-email", http(401, "Invalid verification code"), "CODE_INVALID"],
    ["verify-email", http(401, "Verification code expired"), "CODE_EXPIRED"],
    [
      "verify-email",
      http(401, "Invalid or expired verification code"),
      "CODE_NONE_ACTIVE",
    ],
    [
      "verify-email",
      http(401, "Too many attempts, please request a new verification code"),
      "CODE_ATTEMPTS_EXHAUSTED",
    ],
    ["verify-email", http(429), "TOO_MANY_ATTEMPTS"],
    [
      "resend-verification",
      http(429, "Please wait a moment before requesting another code"),
      "RESEND_COOLDOWN",
    ],
    [
      "resend-verification",
      http(429, "ThrottlerException: Too Many Requests"),
      "RATE_LIMITED",
    ],
    [
      "resend-verification",
      http(503, "Unable to send the verification email, try again later"),
      "EMAIL_SEND_FAILED",
    ],
    ["forgot-password", http(429), "RATE_LIMITED"],
    ["reset-password", http(401, "Invalid reset token"), "RESET_INVALID"],
    ["reset-password", http(401, "Reset token expired"), "RESET_EXPIRED"],
    [
      "reset-password",
      http(401, "Reset token already used"),
      "RESET_ALREADY_USED",
    ],
    [
      "reset-password",
      http(401, "This reset link has been replaced by a newer request"),
      "RESET_REPLACED",
    ],
    [
      "reset-password",
      http(401, "New password must be different from your current password"),
      "RESET_SAME_PASSWORD",
    ],
    [
      "oauth-exchange",
      http(401, "OAuth login token already used"),
      "OAUTH_FAILED",
    ],
    ["oauth-exchange", http(429), "OAUTH_RATE_LIMITED"],
  ] as const)("%s %o → %s", (endpoint, result, code) => {
    expect(mapBackendError(endpoint, result)).toBe(code)
  })
})

describe("mapBackendError — fallthrough for unmatched messages", () => {
  it("maps an unmatched verify-email 401 to SESSION_EXPIRED", () => {
    expect(mapBackendError("verify-email", http(401, "Unauthorized"))).toBe(
      "SESSION_EXPIRED"
    )
  })

  it("maps an unmatched reset-password 401 to RESET_INVALID", () => {
    expect(mapBackendError("reset-password", http(401, "Something new"))).toBe(
      "RESET_INVALID"
    )
  })

  it("matches messages exactly, not by prefix or case", () => {
    expect(
      mapBackendError("verify-email", http(401, "invalid verification code"))
    ).toBe("SESSION_EXPIRED")
    expect(
      mapBackendError("reset-password", http(401, "Reset token expired!"))
    ).toBe("RESET_INVALID")
  })

  it("never matches an array message", () => {
    expect(
      mapBackendError("verify-email", http(401, ["Invalid verification code"]))
    ).toBe("SESSION_EXPIRED")
  })

  it.each([
    ["signup", http(401)],
    ["forgot-password", http(404)],
  ] as const)(
    "maps an unlisted 4xx on %s to UNEXPECTED",
    (endpoint, result) => {
      expect(mapBackendError(endpoint, result)).toBe("UNEXPECTED")
    }
  )
})

describe("mapBackendError — inherited property names", () => {
  it.each(["toString", "constructor", "__proto__"])(
    "does not treat %j as a known message",
    (message) => {
      expect(mapBackendError("verify-email", http(401, message))).toBe(
        "SESSION_EXPIRED"
      )
      expect(mapBackendError("reset-password", http(401, message))).toBe(
        "RESET_INVALID"
      )
      expect(isVerifyCodeError(message)).toBe(false)
    }
  )
})

describe("mapBackendError — rows common to every endpoint", () => {
  it.each(ALL_ENDPOINTS)("%s: 400 → VALIDATION", (endpoint) => {
    expect(
      mapBackendError(endpoint, http(400, ["email must be an email"]))
    ).toBe("VALIDATION")
  })

  it.each(ALL_ENDPOINTS)("%s: network → NETWORK_ERROR", (endpoint) => {
    expect(mapBackendError(endpoint, { ok: false, kind: "network" })).toBe(
      "NETWORK_ERROR"
    )
  })

  it.each(ALL_ENDPOINTS)("%s: invalid_response → UNEXPECTED", (endpoint) => {
    expect(
      mapBackendError(endpoint, {
        ok: false,
        kind: "invalid_response",
        status: 200,
      })
    ).toBe("UNEXPECTED")
  })

  it.each(ALL_ENDPOINTS)(
    "%s: session_expired → SESSION_EXPIRED",
    (endpoint) => {
      expect(
        mapBackendError(endpoint, { ok: false, kind: "session_expired" })
      ).toBe("SESSION_EXPIRED")
    }
  )

  it.each(ALL_ENDPOINTS)(
    "%s: email_not_verified → EMAIL_NOT_VERIFIED",
    (endpoint) => {
      expect(
        mapBackendError(endpoint, { ok: false, kind: "email_not_verified" })
      ).toBe("EMAIL_NOT_VERIFIED")
    }
  )

  it.each(
    ALL_ENDPOINTS.filter((endpoint) => endpoint !== "resend-verification")
  )("%s: 503 → SERVER_ERROR", (endpoint) => {
    expect(mapBackendError(endpoint, http(503))).toBe("SERVER_ERROR")
  })

  it.each(ALL_ENDPOINTS)("%s: 500 → SERVER_ERROR", (endpoint) => {
    expect(mapBackendError(endpoint, http(500))).toBe("SERVER_ERROR")
  })

  it.each([
    "signup",
    "reset-password",
    "resend-verification",
    "forgot-password",
  ] as const)("%s: a 429 without its own row → RATE_LIMITED", (endpoint) => {
    expect(mapBackendError(endpoint, http(429))).toBe("RATE_LIMITED")
  })
})

describe("isVerifyCodeError", () => {
  it.each([
    "Invalid verification code",
    "Verification code expired",
    "Invalid or expired verification code",
    "Too many attempts, please request a new verification code",
  ])("is true for %j", (message) => {
    expect(isVerifyCodeError(message)).toBe(true)
  })

  it.each([
    "Unauthorized",
    "Email not verified",
    "",
    ["Invalid verification code"],
  ])("is false for %j", (message) => {
    expect(isVerifyCodeError(message)).toBe(false)
  })
})
