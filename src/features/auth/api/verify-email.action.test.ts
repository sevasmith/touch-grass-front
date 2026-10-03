// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

import { json, mockFetch } from "@/test/fetch.mock"
import { cookieJar, resetNextHeaders } from "@/test/next-headers.mock"

import { verifyEmail } from "./verify-email.action"

vi.mock("next/headers", () => import("@/test/next-headers.mock"))

const newPair = { accessToken: "at-2", refreshToken: "rt-2" }
const unauthorized = (message: string) =>
  json(401, { statusCode: 401, message, error: "Unauthorized" })

beforeEach(() => {
  const globals = globalThis as Record<string, unknown>
  delete globals.__touchGrassMemoryKv
  delete globals.__touchGrassKvStore
  resetNextHeaders()
  cookieJar.seed({ tg_at: "at-1", tg_rt: "rt-1" })
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("verifyEmail action", () => {
  it("on 204 redirects to /map with no refresh and no re-login (FR-016)", async () => {
    const api = mockFetch({ "POST /auth/verify-email": json(204) })

    expect(await verifyEmail({ code: "012345" })).toEqual({
      ok: true,
      redirectTo: "/map",
    })
    expect(api.calls("POST /auth/verify-email")[0].body).toEqual({
      code: "012345",
    })
    expect(
      api.calls("POST /auth/verify-email")[0].headers.get("authorization")
    ).toBe("Bearer at-1")
    expect(api.calls("POST /auth/refresh")).toHaveLength(0)
    expect(api.calls("POST /auth/login")).toHaveLength(0)
  })

  it.each([
    ["Invalid verification code", "CODE_INVALID"],
    ["Verification code expired", "CODE_EXPIRED"],
    ["Invalid or expired verification code", "CODE_NONE_ACTIVE"],
    [
      "Too many attempts, please request a new verification code",
      "CODE_ATTEMPTS_EXHAUSTED",
    ],
  ])(
    "maps %j to %s with exactly one attempt and no refresh (FR-014, SC-011)",
    async (message, error) => {
      const api = mockFetch({
        "POST /auth/verify-email": unauthorized(message),
      })

      expect(await verifyEmail({ code: "123456" })).toEqual({
        ok: false,
        error,
      })
      expect(api.calls("POST /auth/verify-email")).toHaveLength(1)
      expect(api.calls("POST /auth/refresh")).toHaveLength(0)
      expect(cookieJar.get("tg_at")?.value).toBe("at-1")
    }
  )

  it("refreshes and retries once on a session 401, then succeeds", async () => {
    const api = mockFetch({
      "POST /auth/verify-email": [unauthorized("Unauthorized"), json(204)],
      "POST /auth/refresh": json(200, newPair),
    })

    expect(await verifyEmail({ code: "123456" })).toEqual({
      ok: true,
      redirectTo: "/map",
    })
    expect(api.calls("POST /auth/refresh")).toHaveLength(1)
    expect(api.calls("POST /auth/verify-email")).toHaveLength(2)
    expect(
      api.calls("POST /auth/verify-email")[1].headers.get("authorization")
    ).toBe("Bearer at-2")
  })

  it("maps a code error on the retry and keeps the new pair", async () => {
    const api = mockFetch({
      "POST /auth/verify-email": [
        unauthorized("Unauthorized"),
        unauthorized("Invalid verification code"),
      ],
      "POST /auth/refresh": json(200, newPair),
    })

    expect(await verifyEmail({ code: "123456" })).toEqual({
      ok: false,
      error: "CODE_INVALID",
    })
    expect(api.calls("POST /auth/verify-email")).toHaveLength(2)
    expect(api.calls("POST /auth/refresh")).toHaveLength(1)
    expect(cookieJar.get("tg_at")?.value).toBe("at-2")
    expect(cookieJar.get("tg_rt")?.value).toBe("rt-2")
  })

  it("returns SESSION_EXPIRED and clears the cookies when the refresh is revoked", async () => {
    mockFetch({
      "POST /auth/verify-email": unauthorized("Unauthorized"),
      "POST /auth/refresh": unauthorized("Refresh token revoked"),
    })

    expect(await verifyEmail({ code: "123456" })).toEqual({
      ok: false,
      error: "SESSION_EXPIRED",
    })
    expect(cookieJar.getAll()).toEqual([])
  })

  it("maps 429 to TOO_MANY_ATTEMPTS", async () => {
    mockFetch({ "POST /auth/verify-email": json(429) })

    expect(await verifyEmail({ code: "123456" })).toEqual({
      ok: false,
      error: "TOO_MANY_ATTEMPTS",
    })
  })

  it("maps a transient refresh failure to NETWORK_ERROR and keeps the session", async () => {
    mockFetch({
      "POST /auth/verify-email": unauthorized("Unauthorized"),
      "POST /auth/refresh": json(503),
    })

    expect(await verifyEmail({ code: "123456" })).toEqual({
      ok: false,
      error: "NETWORK_ERROR",
    })
    expect(cookieJar.get("tg_rt")?.value).toBe("rt-1")
  })

  it.each([{ code: "12345" }, { code: "12a456" }, {}, null])(
    "rejects invalid input %o with VALIDATION and no backend call",
    async (input) => {
      const api = mockFetch({})

      expect(await verifyEmail(input)).toMatchObject({
        ok: false,
        error: "VALIDATION",
      })
      expect(api.calls()).toHaveLength(0)
    }
  )

  it("returns SESSION_EXPIRED without a backend call when there is no session", async () => {
    resetNextHeaders()
    const api = mockFetch({})

    expect(await verifyEmail({ code: "123456" })).toEqual({
      ok: false,
      error: "SESSION_EXPIRED",
    })
    expect(api.calls()).toHaveLength(0)
  })
})
