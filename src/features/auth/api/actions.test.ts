import { redirect } from "next/navigation"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError, apiFetch } from "@/shared/api/client"
import {
  clearSessionToken,
  getSessionToken,
  setSessionToken,
} from "@/shared/api/session"

import {
  forgotPassword,
  login,
  logout,
  register,
  resendVerificationEmail,
  resetPassword,
  verifyEmail,
} from "./actions"

vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

// Self-contained: provide a real `ApiError` class (so `instanceof` works in the
// action code under test) and mock only `apiFetch`. Using `importOriginal()` here
// would load the real `client.ts`, which transitively imports the real
// `session.ts` -> `next/headers` (a Next.js server-only module) and hangs Vitest
// on warm cache re-runs.
vi.mock("@/shared/api/client", () => {
  class ApiError extends Error {
    readonly status: number
    readonly body: {
      message?: string
      code?: string
      fieldErrors?: Record<string, string[]>
    }

    constructor(
      status: number,
      body: {
        message?: string
        code?: string
        fieldErrors?: Record<string, string[]>
      }
    ) {
      super(body.message ?? `Request failed with status ${status}`)
      this.name = "ApiError"
      this.status = status
      this.body = body
    }
  }

  return { ApiError, apiFetch: vi.fn() }
})

vi.mock("@/shared/api/session", () => ({
  getSessionToken: vi.fn(),
  setSessionToken: vi.fn(),
  clearSessionToken: vi.fn(),
}))

const form = (obj: Record<string, string>) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(obj)) fd.append(k, v)
  return fd
}

const validSession = {
  token: "session-token",
  expiresAt: "2026-09-23T12:00:00Z",
  user: {
    id: "123e4567-e89b-12d3-a456-426614174000",
    email: "user@example.com",
    emailVerified: true,
  },
}

const unverifiedSession = {
  ...validSession,
  user: { ...validSession.user, emailVerified: false },
}

beforeEach(() => {
  vi.mocked(apiFetch).mockReset()
  vi.mocked(redirect).mockReset()
  vi.mocked(getSessionToken).mockReset()
  vi.mocked(setSessionToken).mockReset()
  vi.mocked(clearSessionToken).mockReset()
})

describe("login", () => {
  it("returns fieldErrors for an empty password and does not call the API", async () => {
    const result = await login(
      undefined,
      form({ email: "user@example.com", password: "" })
    )

    expect(result).toEqual({
      fieldErrors: { password: ["Password is required"] },
    })
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it("posts to the login endpoint, stores the token, and redirects to the dashboard", async () => {
    vi.mocked(apiFetch).mockResolvedValue(validSession)

    await login(
      undefined,
      form({ email: "user@example.com", password: "password123" })
    )

    expect(apiFetch).toHaveBeenCalledWith("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "user@example.com",
        password: "password123",
      }),
    })
    expect(setSessionToken).toHaveBeenCalledWith("session-token")
    expect(redirect).toHaveBeenCalledWith("/dashboard")
  })

  it("redirects to check-email when the email is not verified", async () => {
    vi.mocked(apiFetch).mockResolvedValue(unverifiedSession)

    await login(
      undefined,
      form({ email: "user@example.com", password: "password123" })
    )

    expect(redirect).toHaveBeenCalledWith("/check-email")
  })

  it("maps a 401 to the server message as a form error", async () => {
    vi.mocked(apiFetch).mockRejectedValue(
      new ApiError(401, { message: "Invalid email or password" })
    )

    const result = await login(
      undefined,
      form({ email: "user@example.com", password: "password123" })
    )

    expect(result).toEqual({ formError: "Invalid email or password" })
  })

  it("maps a network error to the generic unavailable message", async () => {
    vi.mocked(apiFetch).mockRejectedValue(
      new ApiError(0, { message: "Network error" })
    )

    const result = await login(
      undefined,
      form({ email: "user@example.com", password: "password123" })
    )

    expect(result).toEqual({
      formError: "Service unavailable. Please try again later.",
    })
  })
})

describe("register", () => {
  it("posts to the register endpoint, stores the token, and redirects to check-email", async () => {
    vi.mocked(apiFetch).mockResolvedValue(validSession)

    await register(
      undefined,
      form({
        email: "user@example.com",
        password: "password123",
        confirmPassword: "password123",
      })
    )

    expect(apiFetch).toHaveBeenCalledWith("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "user@example.com",
        password: "password123",
        confirmPassword: "password123",
      }),
    })
    expect(setSessionToken).toHaveBeenCalledWith("session-token")
    expect(redirect).toHaveBeenCalledWith("/check-email")
  })

  it("maps a 409 with fieldErrors to fieldErrors", async () => {
    vi.mocked(apiFetch).mockRejectedValue(
      new ApiError(409, {
        message: "Conflict",
        fieldErrors: { email: ["An account with this email already exists"] },
      })
    )

    const result = await register(
      undefined,
      form({
        email: "user@example.com",
        password: "password123",
        confirmPassword: "password123",
      })
    )

    expect(result).toEqual({
      fieldErrors: { email: ["An account with this email already exists"] },
    })
  })
})

describe("logout", () => {
  it("logs out, clears the token, and redirects to login", async () => {
    vi.mocked(getSessionToken).mockResolvedValue("tok")

    await logout()

    expect(apiFetch).toHaveBeenCalledWith("/api/auth/logout", {
      method: "POST",
    })
    expect(clearSessionToken).toHaveBeenCalled()
    expect(redirect).toHaveBeenCalledWith("/login")
  })
})

describe("forgotPassword", () => {
  it("posts the email and redirects with sent=true", async () => {
    vi.mocked(apiFetch).mockResolvedValue(undefined)

    await forgotPassword(undefined, form({ email: "user@example.com" }))

    expect(apiFetch).toHaveBeenCalledWith("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com" }),
    })
    expect(redirect).toHaveBeenCalledWith("/forgot-password?sent=true")
  })

  it("maps a network error to the generic unavailable message", async () => {
    vi.mocked(apiFetch).mockRejectedValue(
      new ApiError(0, { message: "Network error" })
    )

    const result = await forgotPassword(
      undefined,
      form({ email: "user@example.com" })
    )

    expect(result).toEqual({
      formError: "Service unavailable. Please try again later.",
    })
  })
})

describe("resetPassword", () => {
  it("posts the reset, stores the token, and redirects to the dashboard", async () => {
    vi.mocked(apiFetch).mockResolvedValue(validSession)

    await resetPassword(
      undefined,
      form({
        password: "password123",
        confirmPassword: "password123",
        token: "reset-token",
      })
    )

    expect(apiFetch).toHaveBeenCalledWith("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        password: "password123",
        confirmPassword: "password123",
        token: "reset-token",
      }),
    })
    expect(setSessionToken).toHaveBeenCalledWith("session-token")
    expect(redirect).toHaveBeenCalledWith("/dashboard")
  })

  it("maps a 400 to the expired-link message", async () => {
    vi.mocked(apiFetch).mockRejectedValue(
      new ApiError(400, {
        message: "This link has expired or has already been used.",
      })
    )

    const result = await resetPassword(
      undefined,
      form({
        password: "password123",
        confirmPassword: "password123",
        token: "reset-token",
      })
    )

    expect(result).toEqual({
      formError: "This link has expired or has already been used.",
    })
  })
})

describe("verifyEmail", () => {
  it("posts the token and redirects to the dashboard", async () => {
    vi.mocked(apiFetch).mockResolvedValue(undefined)

    await verifyEmail("verify-token")

    expect(apiFetch).toHaveBeenCalledWith("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token: "verify-token" }),
    })
    expect(redirect).toHaveBeenCalledWith("/dashboard")
  })

  it("redirects to check-email with expired error on failure", async () => {
    vi.mocked(apiFetch).mockRejectedValue(
      new ApiError(500, { message: "boom" })
    )

    await verifyEmail("verify-token")

    expect(redirect).toHaveBeenCalledWith("/check-email?error=expired")
  })
})

describe("resendVerificationEmail", () => {
  it("resends and returns an empty result", async () => {
    vi.mocked(getSessionToken).mockResolvedValue("tok")
    vi.mocked(apiFetch).mockResolvedValue(undefined)

    const result = await resendVerificationEmail(undefined, new FormData())

    expect(apiFetch).toHaveBeenCalledWith("/api/auth/resend-verification", {
      method: "POST",
    })
    expect(result).toEqual({})
  })

  it("returns a session-expired error without calling the API", async () => {
    vi.mocked(getSessionToken).mockResolvedValue(undefined)

    const result = await resendVerificationEmail(undefined, new FormData())

    expect(result).toEqual({
      formError: "Your session has expired. Please log in again.",
    })
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it("maps a 429 to the rate-limit message", async () => {
    vi.mocked(getSessionToken).mockResolvedValue("tok")
    vi.mocked(apiFetch).mockRejectedValue(
      new ApiError(429, { message: "Too many requests" })
    )

    const result = await resendVerificationEmail(undefined, new FormData())

    expect(result).toEqual({
      formError: "Please wait before requesting another email.",
    })
  })
})
