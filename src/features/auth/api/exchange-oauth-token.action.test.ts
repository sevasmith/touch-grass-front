// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

import { json, mockFetch, type FetchRoute } from "@/test/fetch.mock"
import { cookieJar, resetNextHeaders } from "@/test/next-headers.mock"

import { exchangeOAuthToken } from "./exchange-oauth-token.action"

vi.mock("next/headers", () => import("@/test/next-headers.mock"))

const pair = { accessToken: "at-1", refreshToken: "rt-1" }
const user = (emailVerified: boolean) =>
  json(200, {
    id: "3f1c2b9a-6a0e-4c8f-9b7d-2e5a1c4d8f00",
    email: "ada@example.com",
    emailVerified,
  })

beforeEach(() => {
  resetNextHeaders()
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("exchangeOAuthToken action", () => {
  it("exchanges the token once, sets the session cookies and sends a verified user to /map", async () => {
    const api = mockFetch({
      "POST /auth/oauth/exchange": json(200, pair),
      "GET /auth/me": user(true),
    })

    expect(await exchangeOAuthToken({ token: "handoff" })).toEqual({
      ok: true,
      redirectTo: "/map",
    })
    expect(api.calls("POST /auth/oauth/exchange")).toHaveLength(1)
    expect(api.calls("POST /auth/oauth/exchange")[0].body).toEqual({
      token: "handoff",
    })
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
      "POST /auth/oauth/exchange": json(200, pair),
      "GET /auth/me": user(false),
    })

    expect(await exchangeOAuthToken({ token: "handoff" })).toEqual({
      ok: true,
      redirectTo: "/verify-email",
    })
  })

  it.each<[string, FetchRoute, string]>([
    [
      "401",
      json(401, {
        statusCode: 401,
        message: "OAuth login token already used",
        error: "Unauthorized",
      }),
      "OAUTH_FAILED",
    ],
    ["429", json(429), "OAUTH_RATE_LIMITED"],
    ["a network failure", new TypeError("fetch failed"), "NETWORK_ERROR"],
  ])("maps %s to %s without retrying", async (_, response, error) => {
    const api = mockFetch({ "POST /auth/oauth/exchange": response })

    expect(await exchangeOAuthToken({ token: "handoff" })).toEqual({
      ok: false,
      error,
    })
    expect(api.calls("POST /auth/oauth/exchange")).toHaveLength(1)
    expect(cookieJar.setCalls).toEqual([])
  })

  it.each([{ token: "" }, {}, null, { token: 42 }])(
    "returns OAUTH_FAILED for %o without a backend call",
    async (input) => {
      const api = mockFetch({})

      expect(await exchangeOAuthToken(input)).toEqual({
        ok: false,
        error: "OAUTH_FAILED",
      })
      expect(api.calls()).toHaveLength(0)
    }
  )

  it("never returns a token", async () => {
    mockFetch({
      "POST /auth/oauth/exchange": json(200, pair),
      "GET /auth/me": user(true),
    })

    const serialized = JSON.stringify(
      await exchangeOAuthToken({ token: "handoff" })
    )

    expect(serialized).not.toContain("at-1")
    expect(serialized).not.toContain("rt-1")
  })
})
