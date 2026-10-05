// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

import { json, mockFetch, type FetchRoute } from "@/test/fetch.mock"
import { cookieJar, resetNextHeaders } from "@/test/next-headers.mock"

import { resetPassword } from "./reset-password.action"

vi.mock("next/headers", () => import("@/test/next-headers.mock"))

const input = {
  token: "t0k3n",
  password: "new horse",
  confirmPassword: "new horse",
}
const unauthorized = (message: string) =>
  json(401, { statusCode: 401, message, error: "Unauthorized" })

beforeEach(() => {
  resetNextHeaders()
  cookieJar.seed({ tg_at: "at-1", tg_rt: "rt-1", tg_code_sent_at: "1" })
  vi.spyOn(console, "error").mockImplementation(() => {})
})

function expectCleared() {
  expect(cookieJar.getAll()).toEqual([])
}

function expectUntouched() {
  expect(cookieJar.deleteCalls).toEqual([])
  expect(cookieJar.get("tg_rt")?.value).toBe("rt-1")
}

describe("resetPassword action", () => {
  it("sends exactly { token, password }", async () => {
    const api = mockFetch({ "POST /auth/reset-password": json(204) })

    await resetPassword(input)

    expect(api.calls("POST /auth/reset-password")[0].body).toEqual({
      token: "t0k3n",
      password: "new horse",
    })
  })

  it("on 204 returns ok and clears this browser's session", async () => {
    mockFetch({ "POST /auth/reset-password": json(204) })

    expect(await resetPassword(input)).toEqual({ ok: true })
    expectCleared()
  })

  it("on 204 also deletes the used handoff token cookie", async () => {
    cookieJar.seed({ tg_reset_token: "t0k3n" })
    mockFetch({ "POST /auth/reset-password": json(204) })

    await resetPassword(input)

    expect(cookieJar.deleteOptions).toContainEqual({
      name: "tg_reset_token",
      path: "/reset-password",
    })
    expect(cookieJar.get("tg_reset_token")).toBeUndefined()
  })

  it("clears the session on RESET_ALREADY_USED", async () => {
    mockFetch({
      "POST /auth/reset-password": unauthorized("Reset token already used"),
    })

    expect(await resetPassword(input)).toEqual({
      ok: false,
      error: "RESET_ALREADY_USED",
    })
    expectCleared()
  })

  it.each([
    ["Invalid reset token", "RESET_INVALID"],
    ["Reset token expired", "RESET_EXPIRED"],
    ["This reset link has been replaced by a newer request", "RESET_REPLACED"],
  ])("maps %j to %s and leaves the cookies alone", async (message, error) => {
    mockFetch({ "POST /auth/reset-password": unauthorized(message) })

    expect(await resetPassword(input)).toEqual({ ok: false, error })
    expectUntouched()
  })

  it("puts RESET_SAME_PASSWORD on the password field", async () => {
    mockFetch({
      "POST /auth/reset-password": unauthorized(
        "New password must be different from your current password"
      ),
    })

    expect(await resetPassword(input)).toEqual({
      ok: false,
      error: "RESET_SAME_PASSWORD",
      fieldErrors: {
        password: "New password must be different from your current password",
      },
    })
    expectUntouched()
  })

  it.each<[string, FetchRoute, string]>([
    ["429", json(429), "RATE_LIMITED"],
    ["a network failure", new TypeError("fetch failed"), "NETWORK_ERROR"],
  ])(
    "maps %s to %s and leaves the cookies alone",
    async (_, response, error) => {
      mockFetch({ "POST /auth/reset-password": response })

      expect(await resetPassword(input)).toEqual({ ok: false, error })
      expectUntouched()
    }
  )

  it("rejects invalid input with VALIDATION and no backend call", async () => {
    const api = mockFetch({})

    expect(
      await resetPassword({ ...input, confirmPassword: "other" })
    ).toMatchObject({
      ok: false,
      error: "VALIDATION",
      fieldErrors: { confirmPassword: "Passwords don't match" },
    })
    expect(api.calls()).toHaveLength(0)
  })
})
