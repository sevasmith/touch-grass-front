// @vitest-environment node
import { redirect } from "next/navigation"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { json, mockFetch, type FetchRoute } from "@/test/fetch.mock"
import { cookieJar, resetNextHeaders } from "@/test/next-headers.mock"

import { logout } from "./logout.action"

vi.mock("next/headers", () => import("@/test/next-headers.mock"))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

beforeEach(() => {
  resetNextHeaders()
  vi.spyOn(console, "error").mockImplementation(() => {})
})

function expectCleared() {
  expect([...cookieJar.deleteCalls].sort()).toEqual([
    "tg_at",
    "tg_code_sent_at",
    "tg_rt",
  ])
  expect(cookieJar.getAll()).toEqual([])
}

describe("logout action", () => {
  it("revokes the refresh token, clears the cookies and redirects to /login", async () => {
    cookieJar.seed({ tg_at: "at-1", tg_rt: "rt-1", tg_code_sent_at: "1" })
    const api = mockFetch({ "POST /auth/logout": json(204) })

    await logout()

    expect(api.calls("POST /auth/logout")).toHaveLength(1)
    expect(api.calls("POST /auth/logout")[0].body).toEqual({
      refreshToken: "rt-1",
    })
    expectCleared()
    expect(redirect).toHaveBeenCalledWith("/login")
  })

  it.each<[string, FetchRoute]>([
    ["a 500", json(500)],
    ["a network failure", new TypeError("fetch failed")],
  ])("still clears the cookies and redirects on %s", async (_, response) => {
    cookieJar.seed({ tg_at: "at-1", tg_rt: "rt-1", tg_code_sent_at: "1" })
    mockFetch({ "POST /auth/logout": response })

    await logout()

    expectCleared()
    expect(redirect).toHaveBeenCalledWith("/login")
  })

  it("skips the backend without a session but still clears and redirects", async () => {
    cookieJar.seed({ tg_code_sent_at: "1" })
    const api = mockFetch({})

    await logout()

    expect(api.calls()).toHaveLength(0)
    expectCleared()
    expect(redirect).toHaveBeenCalledWith("/login")
  })
})
