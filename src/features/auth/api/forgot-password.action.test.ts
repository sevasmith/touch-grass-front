// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

import { json, mockFetch, type FetchRoute } from "@/test/fetch.mock"
import { resetNextHeaders } from "@/test/next-headers.mock"

import { forgotPassword } from "./forgot-password.action"

vi.mock("next/headers", () => import("@/test/next-headers.mock"))

const BACKEND_MESSAGE = "If that email exists, a reset link has been sent"

beforeEach(() => {
  resetNextHeaders()
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("forgotPassword action", () => {
  it("posts the email and returns ok without the backend message", async () => {
    const api = mockFetch({
      "POST /auth/forgot-password": json(200, { message: BACKEND_MESSAGE }),
    })

    const result = await forgotPassword({ email: " ada@example.com " })

    expect(result).toEqual({ ok: true })
    expect(JSON.stringify(result)).not.toContain(BACKEND_MESSAGE)
    expect(api.calls("POST /auth/forgot-password")[0].body).toEqual({
      email: "ada@example.com",
    })
  })

  it.each<[string, FetchRoute, string]>([
    ["429", json(429), "RATE_LIMITED"],
    ["a network failure", new TypeError("fetch failed"), "NETWORK_ERROR"],
    ["a 500", json(500), "SERVER_ERROR"],
  ])("maps %s to %s", async (_, response, error) => {
    mockFetch({ "POST /auth/forgot-password": response })

    expect(await forgotPassword({ email: "ada@example.com" })).toEqual({
      ok: false,
      error,
    })
  })

  it("rejects invalid input with VALIDATION and no backend call", async () => {
    const api = mockFetch({})

    expect(await forgotPassword({ email: "ada" })).toEqual({
      ok: false,
      error: "VALIDATION",
      fieldErrors: { email: "Enter a valid email address" },
    })
    expect(api.calls()).toHaveLength(0)
  })
})
