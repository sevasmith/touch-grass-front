// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

import { json, mockFetch } from "@/test/fetch.mock"
import { resetNextHeaders, setForwardedFor } from "@/test/next-headers.mock"

import { backendFetch } from "./backend-fetch"

vi.mock("next/headers", () => import("@/test/next-headers.mock"))

const PairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
})
const pair = { accessToken: "at-1", refreshToken: "rt-1" }

beforeEach(() => {
  resetNextHeaders()
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("backendFetch — request", () => {
  it("calls NEXT_PUBLIC_API_URL + path with a JSON body", async () => {
    const api = mockFetch({ "POST /auth/login": json(200, pair) })

    await backendFetch("/auth/login", {
      method: "POST",
      body: { email: "a@b.co", password: "pw" },
      schema: PairSchema,
    })

    const [call] = api.calls("POST /auth/login")
    expect(call.url).toBe("http://api.test/auth/login")
    expect(call.headers.get("content-type")).toBe("application/json")
    expect(call.body).toEqual({ email: "a@b.co", password: "pw" })
  })

  it("sends no content-type and no body without a body", async () => {
    const api = mockFetch({ "GET /auth/me": json(200, {}) })

    await backendFetch("/auth/me", { method: "GET" })

    const [call] = api.calls("GET /auth/me")
    expect(call.headers.has("content-type")).toBe(false)
    expect(call.body).toBeUndefined()
  })

  it("sends Authorization: Bearer when an accessToken is given", async () => {
    const api = mockFetch({ "GET /auth/me": json(200, {}) })

    await backendFetch("/auth/me", { method: "GET", accessToken: "at-1" })

    expect(api.calls("GET /auth/me")[0].headers.get("authorization")).toBe(
      "Bearer at-1"
    )
  })

  it("sends no Authorization header without an accessToken", async () => {
    const api = mockFetch({ "GET /auth/me": json(200, {}) })

    await backendFetch("/auth/me", { method: "GET" })

    expect(api.calls("GET /auth/me")[0].headers.has("authorization")).toBe(
      false
    )
  })

  it("forwards the first hop of the incoming x-forwarded-for", async () => {
    setForwardedFor("203.0.113.7, 10.0.0.1")
    const api = mockFetch({ "GET /auth/me": json(200, {}) })

    await backendFetch("/auth/me", { method: "GET" })

    expect(api.calls("GET /auth/me")[0].headers.get("x-forwarded-for")).toBe(
      "203.0.113.7"
    )
  })

  it("sends no X-Forwarded-For when the incoming request has none", async () => {
    const api = mockFetch({ "GET /auth/me": json(200, {}) })

    await backendFetch("/auth/me", { method: "GET" })

    expect(api.calls("GET /auth/me")[0].headers.has("x-forwarded-for")).toBe(
      false
    )
  })

  it("passes an 8 s timeout signal", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout")
    mockFetch({ "GET /auth/me": json(200, {}) })

    await backendFetch("/auth/me", { method: "GET" })

    expect(timeout).toHaveBeenCalledWith(8000)
  })
})

describe("backendFetch — results (never throws)", () => {
  it("returns parsed data for a 2xx with a schema", async () => {
    mockFetch({ "POST /auth/login": json(200, pair) })

    const result = await backendFetch("/auth/login", {
      method: "POST",
      schema: PairSchema,
    })

    expect(result).toEqual({ ok: true, status: 200, data: pair })
  })

  it("returns data: undefined for a 204 without a schema", async () => {
    mockFetch({ "POST /auth/logout": json(204) })

    const result = await backendFetch("/auth/logout", { method: "POST" })

    expect(result).toEqual({ ok: true, status: 204, data: undefined })
  })

  it("returns invalid_response for a 2xx that fails the schema", async () => {
    mockFetch({ "POST /auth/login": json(200, { accessToken: 1 }) })

    const result = await backendFetch("/auth/login", {
      method: "POST",
      schema: PairSchema,
    })

    expect(result).toEqual({ ok: false, kind: "invalid_response", status: 200 })
  })

  it("returns invalid_response for a 2xx whose body is not JSON", async () => {
    mockFetch({ "POST /auth/login": new Response("<html>", { status: 200 }) })

    const result = await backendFetch("/auth/login", {
      method: "POST",
      schema: PairSchema,
    })

    expect(result).toEqual({ ok: false, kind: "invalid_response", status: 200 })
  })

  it("returns an http error with the parsed ApiError for a non-2xx", async () => {
    const body = {
      statusCode: 401,
      message: "Invalid credentials",
      error: "Unauthorized",
    }
    mockFetch({ "POST /auth/login": json(401, body) })

    const result = await backendFetch("/auth/login", {
      method: "POST",
      schema: PairSchema,
    })

    expect(result).toEqual({
      ok: false,
      kind: "http",
      status: 401,
      error: body,
    })
  })

  it("falls back to an Unknown ApiError for an unparseable error body", async () => {
    mockFetch({ "GET /auth/me": new Response("Bad Gateway", { status: 502 }) })

    const result = await backendFetch("/auth/me", { method: "GET" })

    expect(result).toEqual({
      ok: false,
      kind: "http",
      status: 502,
      error: { statusCode: 502, message: "", error: "Unknown" },
    })
  })

  it("returns network for a network failure", async () => {
    mockFetch({ "GET /auth/me": new TypeError("fetch failed") })

    const result = await backendFetch("/auth/me", { method: "GET" })

    expect(result).toEqual({ ok: false, kind: "network" })
  })

  it("returns network for a timeout abort", async () => {
    mockFetch({
      "GET /auth/me": new DOMException(
        "The operation timed out.",
        "TimeoutError"
      ),
    })

    const result = await backendFetch("/auth/me", { method: "GET" })

    expect(result).toEqual({ ok: false, kind: "network" })
  })
})

describe("backendFetch — logging", () => {
  it("logs method, path and status for a 5xx, without the body or token", async () => {
    mockFetch({ "POST /auth/login": json(500, { secret: "rt-1" }) })

    await backendFetch("/auth/login", {
      method: "POST",
      body: { password: "hunter22" },
      accessToken: "at-1",
    })

    expect(console.error).toHaveBeenCalledTimes(1)
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls)
    expect(logged).toContain("POST")
    expect(logged).toContain("/auth/login")
    expect(logged).toContain("500")
    expect(logged).not.toMatch(/rt-1|at-1|hunter22/)
  })

  it("logs a network failure without secrets", async () => {
    mockFetch({ "GET /auth/me": new TypeError("fetch failed") })

    await backendFetch("/auth/me", { method: "GET", accessToken: "at-1" })

    expect(console.error).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      "at-1"
    )
  })

  it("does not log a 4xx", async () => {
    mockFetch({ "POST /auth/login": json(401, {}) })

    await backendFetch("/auth/login", { method: "POST" })

    expect(console.error).not.toHaveBeenCalled()
  })
})
