// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { json, mockFetch } from "@/test/fetch.mock"
import { cookieJar, resetNextHeaders } from "@/test/next-headers.mock"

import { register } from "./register.action"

vi.mock("next/headers", () => import("@/test/next-headers.mock"))

const NOW = 1_790_000_000_000
const input = {
  email: "ada@example.com",
  password: "correct horse",
  confirmPassword: "correct horse",
}
const pair = { accessToken: "at-1", refreshToken: "rt-1" }

beforeEach(() => {
  resetNextHeaders()
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
})

describe("register action", () => {
  it("sends only { email, password } to POST /auth/signup", async () => {
    const api = mockFetch({ "POST /auth/signup": json(201, pair) })

    await register(input)

    expect(api.calls("POST /auth/signup")[0].body).toEqual({
      email: "ada@example.com",
      password: "correct horse",
    })
  })

  it("on 201 sets the session and code-sent cookies and redirects to /verify-email", async () => {
    mockFetch({ "POST /auth/signup": json(201, pair) })

    expect(await register(input)).toEqual({
      ok: true,
      redirectTo: "/verify-email",
    })
    expect(cookieJar.lastSet("tg_at")).toMatchObject({
      value: "at-1",
      options: { httpOnly: true },
    })
    expect(cookieJar.lastSet("tg_rt")).toMatchObject({
      value: "rt-1",
      options: { httpOnly: true },
    })
    expect(cookieJar.lastSet("tg_code_sent_at")).toMatchObject({
      value: String(NOW),
      options: { httpOnly: true, maxAge: 900 },
    })
  })

  it("maps 409 to EMAIL_TAKEN with a field error on email and sets no cookies", async () => {
    mockFetch({
      "POST /auth/signup": json(409, {
        statusCode: 409,
        message: "Email already registered",
        error: "Conflict",
      }),
    })

    expect(await register(input)).toEqual({
      ok: false,
      error: "EMAIL_TAKEN",
      fieldErrors: {
        email: "This email is already registered. Log in instead?",
      },
    })
    expect(cookieJar.setCalls).toEqual([])
  })

  it.each([
    [
      "400",
      json(400, {
        statusCode: 400,
        message: ["email must be an email"],
        error: "Bad Request",
      }),
      "VALIDATION",
    ],
    ["429", json(429), "RATE_LIMITED"],
    ["a network failure", new TypeError("fetch failed"), "NETWORK_ERROR"],
    ["a 500", json(500), "SERVER_ERROR"],
  ] as const)("maps %s to %s", async (_, response, error) => {
    mockFetch({ "POST /auth/signup": response })

    expect(await register(input)).toEqual({ ok: false, error })
  })

  it("rejects invalid input with field errors and no backend call", async () => {
    const api = mockFetch({})

    const result = await register({
      ...input,
      password: "short",
      confirmPassword: "other",
    })

    expect(result).toEqual({
      ok: false,
      error: "VALIDATION",
      fieldErrors: {
        password: "Password must be 8–72 characters",
        confirmPassword: "Passwords don't match",
      },
    })
    expect(api.calls()).toHaveLength(0)
  })

  it("maps a thrown error to UNEXPECTED", async () => {
    mockFetch({ "POST /auth/signup": json(201, pair) })
    vi.spyOn(cookieJar, "set").mockImplementation(() => {
      throw new Error("cookie store unavailable")
    })

    expect(await register(input)).toEqual({ ok: false, error: "UNEXPECTED" })
  })

  it("never returns a token", async () => {
    mockFetch({ "POST /auth/signup": json(201, pair) })

    const serialized = JSON.stringify(await register(input))

    expect(serialized).not.toContain("at-1")
    expect(serialized).not.toContain("rt-1")
  })
})
