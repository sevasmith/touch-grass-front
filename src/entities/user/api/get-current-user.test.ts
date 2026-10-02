// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

import { json, mockFetch } from "@/test/fetch.mock"
import { resetNextHeaders } from "@/test/next-headers.mock"

import { getCurrentUser } from "./get-current-user"

vi.mock("next/headers", () => import("@/test/next-headers.mock"))

const user = {
  id: "3f1c2b9a-6a0e-4c8f-9b7d-2e5a1c4d8f00",
  email: "ada@example.com",
  emailVerified: true,
}

beforeEach(() => {
  resetNextHeaders()
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("getCurrentUser", () => {
  it("sends GET /auth/me with the bearer token and returns the user", async () => {
    const api = mockFetch({ "GET /auth/me": json(200, user) })

    const result = await getCurrentUser("at-1")

    expect(result).toEqual({ ok: true, user })
    expect(api.calls("GET /auth/me")[0].headers.get("authorization")).toBe(
      "Bearer at-1"
    )
  })

  it("returns unauthorized on 401", async () => {
    mockFetch({
      "GET /auth/me": json(401, {
        statusCode: 401,
        message: "Unauthorized",
        error: "Unauthorized",
      }),
    })

    expect(await getCurrentUser("at-1")).toEqual({
      ok: false,
      reason: "unauthorized",
    })
  })

  it.each([
    ["a network failure", new TypeError("fetch failed")],
    ["a 5xx", json(503)],
    ["a 429", json(429)],
    ["a body that fails CurrentUserSchema", json(200, { ...user, id: "nope" })],
  ])("returns transient on %s", async (_, response) => {
    mockFetch({ "GET /auth/me": response })

    expect(await getCurrentUser("at-1")).toEqual({
      ok: false,
      reason: "transient",
    })
  })
})
