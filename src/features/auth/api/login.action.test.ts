// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

import { json, mockFetch } from "@/test/fetch.mock"
import { cookieJar, resetNextHeaders } from "@/test/next-headers.mock"

import { login } from "./login.action"

vi.mock("next/headers", () => import("@/test/next-headers.mock"))

const credentials = { email: "ada@example.com", password: "correct horse" }
const pair = { accessToken: "at-1", refreshToken: "rt-1" }
const user = (emailVerified: boolean) => ({
  id: "3f1c2b9a-6a0e-4c8f-9b7d-2e5a1c4d8f00",
  email: "ada@example.com",
  emailVerified,
})

beforeEach(() => {
  resetNextHeaders()
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("login action", () => {
  it("rejects invalid input with field errors and no backend call", async () => {
    const api = mockFetch({})

    const result = await login({ email: "nope", password: "" })

    expect(result).toEqual({
      ok: false,
      error: "VALIDATION",
      fieldErrors: {
        email: "Enter a valid email address",
        password: "Enter your password",
      },
    })
    expect(api.calls()).toHaveLength(0)
  })

  it("rejects a non-object input", async () => {
    mockFetch({})

    expect(await login(null)).toMatchObject({ ok: false, error: "VALIDATION" })
  })

  it("posts the trimmed credentials, sets the session cookies and sends a verified user to /map", async () => {
    const api = mockFetch({
      "POST /auth/login": json(200, pair),
      "GET /auth/me": json(200, user(true)),
    })

    const result = await login({ ...credentials, email: " ada@example.com " })

    expect(result).toEqual({ ok: true, redirectTo: "/map" })
    expect(api.calls("POST /auth/login")[0].body).toEqual(credentials)
    expect(api.calls("GET /auth/me")[0].headers.get("authorization")).toBe(
      "Bearer at-1"
    )
    expect(cookieJar.lastSet("tg_at")).toMatchObject({
      value: "at-1",
      options: { httpOnly: true },
    })
    expect(cookieJar.lastSet("tg_rt")).toMatchObject({
      value: "rt-1",
      options: { httpOnly: true },
    })
  })

  it("sends an unverified user to /verify-email", async () => {
    mockFetch({
      "POST /auth/login": json(200, pair),
      "GET /auth/me": json(200, user(false)),
    })

    expect(await login(credentials)).toEqual({
      ok: true,
      redirectTo: "/verify-email",
    })
  })

  it("falls back to /map when /auth/me fails (the proxy re-tiers)", async () => {
    mockFetch({
      "POST /auth/login": json(200, pair),
      "GET /auth/me": json(503),
    })

    expect(await login(credentials)).toEqual({ ok: true, redirectTo: "/map" })
  })

  it("maps 401 to INVALID_CREDENTIALS and sets no cookies", async () => {
    mockFetch({
      "POST /auth/login": json(401, {
        statusCode: 401,
        message: "Invalid credentials",
        error: "Unauthorized",
      }),
    })

    expect(await login(credentials)).toEqual({
      ok: false,
      error: "INVALID_CREDENTIALS",
    })
    expect(cookieJar.setCalls).toEqual([])
  })

  it.each([
    ["429", json(429), "TOO_MANY_ATTEMPTS"],
    ["a network failure", new TypeError("fetch failed"), "NETWORK_ERROR"],
    ["a 500", json(500), "SERVER_ERROR"],
  ] as const)("maps %s to %s", async (_, response, error) => {
    mockFetch({ "POST /auth/login": response })

    expect(await login(credentials)).toEqual({ ok: false, error })
  })

  it("maps a thrown error to UNEXPECTED and logs it", async () => {
    mockFetch({ "POST /auth/login": json(200, pair) })
    vi.spyOn(cookieJar, "set").mockImplementation(() => {
      throw new Error("cookie store unavailable")
    })

    expect(await login(credentials)).toEqual({ ok: false, error: "UNEXPECTED" })
    expect(console.error).toHaveBeenCalled()
  })

  it("never returns a token", async () => {
    mockFetch({
      "POST /auth/login": json(200, pair),
      "GET /auth/me": json(200, user(true)),
    })

    const serialized = JSON.stringify(await login(credentials))

    expect(serialized).not.toContain(pair.accessToken)
    expect(serialized).not.toContain(pair.refreshToken)
  })
})
