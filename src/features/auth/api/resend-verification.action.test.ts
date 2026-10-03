// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { json, mockFetch } from "@/test/fetch.mock"
import { cookieJar, resetNextHeaders } from "@/test/next-headers.mock"

import { resendVerification } from "./resend-verification.action"

vi.mock("next/headers", () => import("@/test/next-headers.mock"))

const NOW = 1_790_000_000_000
const ENDS_AT = NOW + 60_000
const error = (status: number, message: string) =>
  json(status, { statusCode: status, message, error: "Error" })

beforeEach(() => {
  const globals = globalThis as Record<string, unknown>
  delete globals.__touchGrassMemoryKv
  delete globals.__touchGrassKvStore
  resetNextHeaders()
  cookieJar.seed({ tg_at: "at-1", tg_rt: "rt-1" })
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
})

function expectCodeSentNow() {
  expect(cookieJar.lastSet("tg_code_sent_at")).toMatchObject({
    value: String(NOW),
    options: { httpOnly: true, maxAge: 900 },
  })
}

describe("resendVerification action", () => {
  it("on 204 records the send time and returns the cooldown end", async () => {
    const api = mockFetch({ "POST /auth/resend-verification": json(204) })

    expect(await resendVerification()).toEqual({
      ok: true,
      cooldownEndsAt: ENDS_AT,
    })
    expect(
      api
        .calls("POST /auth/resend-verification")[0]
        .headers.get("authorization")
    ).toBe("Bearer at-1")
    expectCodeSentNow()
  })

  it.each([
    [
      "the cooldown 429",
      error(429, "Please wait a moment before requesting another code"),
      "RESEND_COOLDOWN",
    ],
    [
      "another 429",
      error(429, "ThrottlerException: Too Many Requests"),
      "RATE_LIMITED",
    ],
    [
      "503",
      error(503, "Unable to send the verification email, try again later"),
      "EMAIL_SEND_FAILED",
    ],
  ] as const)(
    "on %s returns %s, starts the cooldown and records the send time",
    async (_, response, code) => {
      mockFetch({ "POST /auth/resend-verification": response })

      expect(await resendVerification()).toEqual({
        ok: false,
        error: code,
        cooldownEndsAt: ENDS_AT,
      })
      expectCodeSentNow()
    }
  )

  it("returns SESSION_EXPIRED when the session is revoked", async () => {
    mockFetch({
      "POST /auth/resend-verification": error(401, "Unauthorized"),
      "POST /auth/refresh": error(401, "Refresh token revoked"),
    })

    expect(await resendVerification()).toEqual({
      ok: false,
      error: "SESSION_EXPIRED",
    })
    expect(cookieJar.lastSet("tg_code_sent_at")).toBeUndefined()
  })

  it("maps a 403 Email not verified to EMAIL_NOT_VERIFIED without crashing", async () => {
    mockFetch({
      "POST /auth/resend-verification": error(403, "Email not verified"),
    })

    expect(await resendVerification()).toEqual({
      ok: false,
      error: "EMAIL_NOT_VERIFIED",
    })
  })

  it("maps a network failure to NETWORK_ERROR without starting the cooldown", async () => {
    mockFetch({
      "POST /auth/resend-verification": new TypeError("fetch failed"),
    })

    expect(await resendVerification()).toEqual({
      ok: false,
      error: "NETWORK_ERROR",
    })
    expect(cookieJar.lastSet("tg_code_sent_at")).toBeUndefined()
  })

  it("maps a thrown error to UNEXPECTED", async () => {
    mockFetch({ "POST /auth/resend-verification": json(204) })
    vi.spyOn(cookieJar, "set").mockImplementation(() => {
      throw new Error("cookie store unavailable")
    })

    expect(await resendVerification()).toEqual({
      ok: false,
      error: "UNEXPECTED",
    })
  })
})
