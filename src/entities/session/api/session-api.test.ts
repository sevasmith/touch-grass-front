// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

import { json, mockFetch } from "@/test/fetch.mock"
import { resetNextHeaders } from "@/test/next-headers.mock"

import { callRefresh } from "./refresh"
import { revokeSession } from "./revoke"

vi.mock("next/headers", () => import("@/test/next-headers.mock"))

const pair = { accessToken: "at-2", refreshToken: "rt-2" }
const unauthorized = {
  statusCode: 401,
  message: "Refresh token already used",
  error: "Unauthorized",
}

beforeEach(() => {
  resetNextHeaders()
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("callRefresh", () => {
  it("POSTs /auth/refresh with the refresh token and returns ok on 200", async () => {
    const api = mockFetch({ "POST /auth/refresh": json(200, pair) })

    expect(await callRefresh("rt-1")).toEqual({ kind: "ok", pair })
    expect(api.calls("POST /auth/refresh")[0].body).toEqual({
      refreshToken: "rt-1",
    })
  })

  it("returns revoked on any 401", async () => {
    mockFetch({ "POST /auth/refresh": json(401, unauthorized) })

    expect(await callRefresh("rt-1")).toEqual({ kind: "revoked" })
  })

  it.each([
    ["a 429", json(429)],
    ["a 5xx", json(500)],
    ["a network failure", new TypeError("fetch failed")],
    ["an invalid response", json(200, { accessToken: "" })],
  ])("returns transient on %s", async (_, response) => {
    mockFetch({ "POST /auth/refresh": response })

    expect(await callRefresh("rt-1")).toEqual({ kind: "transient" })
  })
})

describe("revokeSession", () => {
  it("POSTs /auth/logout with the refresh token", async () => {
    const api = mockFetch({ "POST /auth/logout": json(204) })

    await expect(revokeSession("rt-1")).resolves.toBeUndefined()
    expect(api.calls("POST /auth/logout")[0].body).toEqual({
      refreshToken: "rt-1",
    })
  })

  it.each([
    ["a 401", json(401, unauthorized)],
    ["a 500", json(500)],
    ["a network failure", new TypeError("fetch failed")],
  ])("resolves without throwing on %s", async (_, response) => {
    mockFetch({ "POST /auth/logout": response })

    await expect(revokeSession("rt-1")).resolves.toBeUndefined()
  })
})
