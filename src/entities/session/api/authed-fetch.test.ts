// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

import { json, mockFetch } from "@/test/fetch.mock"
import { cookieJar, resetNextHeaders } from "@/test/next-headers.mock"

import { refreshSession } from "../lib/refresh-coordinator"
import { authedFetch } from "./authed-fetch"

vi.mock("next/headers", () => import("@/test/next-headers.mock"))
vi.mock("../lib/refresh-coordinator", () => ({ refreshSession: vi.fn() }))

const newPair = { accessToken: "at-2", refreshToken: "rt-2" }
const sessionExpired = {
  statusCode: 401,
  message: "Unauthorized",
  error: "Unauthorized",
}
const codeInvalid = {
  statusCode: 401,
  message: "Invalid verification code",
  error: "Unauthorized",
}
const notVerified = {
  statusCode: 403,
  message: "Email not verified",
  error: "Forbidden",
}
const DataSchema = z.object({ value: z.number() })

function bearer(api: ReturnType<typeof mockFetch>, index: number) {
  return api.calls("POST /things")[index].headers.get("authorization")
}

beforeEach(() => {
  resetNextHeaders()
  cookieJar.seed({ tg_at: "at-1", tg_rt: "rt-1", tg_code_sent_at: "1" })
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("authedFetch", () => {
  it("attaches the access token and returns the result", async () => {
    const api = mockFetch({ "POST /things": json(200, { value: 1 }) })

    const result = await authedFetch("/things", {
      method: "POST",
      schema: DataSchema,
    })

    expect(result).toEqual({ ok: true, status: 200, data: { value: 1 } })
    expect(bearer(api, 0)).toBe("Bearer at-1")
    expect(refreshSession).not.toHaveBeenCalled()
  })

  it("returns session_expired without a backend call when there is no session", async () => {
    resetNextHeaders()
    const api = mockFetch({ "POST /things": json(200, { value: 1 }) })

    expect(await authedFetch("/things", { method: "POST" })).toEqual({
      ok: false,
      kind: "session_expired",
    })
    expect(api.calls()).toHaveLength(0)
  })

  describe("on a session 401", () => {
    it("refreshes once, writes the new pair and retries once with the new token", async () => {
      vi.mocked(refreshSession).mockResolvedValue({ kind: "ok", pair: newPair })
      const api = mockFetch({
        "POST /things": [json(401, sessionExpired), json(200, { value: 2 })],
      })

      const result = await authedFetch("/things", {
        method: "POST",
        schema: DataSchema,
      })

      expect(result).toEqual({ ok: true, status: 200, data: { value: 2 } })
      expect(refreshSession).toHaveBeenCalledTimes(1)
      expect(refreshSession).toHaveBeenCalledWith("rt-1")
      expect(api.calls("POST /things")).toHaveLength(2)
      expect(bearer(api, 1)).toBe("Bearer at-2")
      expect(cookieJar.get("tg_at")?.value).toBe("at-2")
      expect(cookieJar.get("tg_rt")?.value).toBe("rt-2")
    })

    it("clears the cookies and returns session_expired when the retry is a session 401 too", async () => {
      vi.mocked(refreshSession).mockResolvedValue({ kind: "ok", pair: newPair })
      const api = mockFetch({ "POST /things": json(401, sessionExpired) })

      expect(await authedFetch("/things", { method: "POST" })).toEqual({
        ok: false,
        kind: "session_expired",
      })
      expect(api.calls("POST /things")).toHaveLength(2)
      expect(refreshSession).toHaveBeenCalledTimes(1)
      expect(cookieJar.getAll()).toEqual([])
    })

    it("returns a business 401 on the retry unchanged and keeps the new pair", async () => {
      vi.mocked(refreshSession).mockResolvedValue({ kind: "ok", pair: newPair })
      mockFetch({
        "POST /things": [json(401, sessionExpired), json(401, codeInvalid)],
      })

      const result = await authedFetch("/things", {
        method: "POST",
        isSessionFailure: (error) => error.message !== codeInvalid.message,
      })

      expect(result).toEqual({
        ok: false,
        kind: "http",
        status: 401,
        error: codeInvalid,
      })
      expect(cookieJar.get("tg_at")?.value).toBe("at-2")
      expect(cookieJar.get("tg_rt")?.value).toBe("rt-2")
    })

    it("clears the cookies and returns session_expired when the refresh is revoked", async () => {
      vi.mocked(refreshSession).mockResolvedValue({ kind: "revoked" })
      const api = mockFetch({ "POST /things": json(401, sessionExpired) })

      expect(await authedFetch("/things", { method: "POST" })).toEqual({
        ok: false,
        kind: "session_expired",
      })
      expect(api.calls("POST /things")).toHaveLength(1)
      expect(cookieJar.getAll()).toEqual([])
    })

    it("returns network and keeps the cookies when the refresh is transient", async () => {
      vi.mocked(refreshSession).mockResolvedValue({ kind: "transient" })
      mockFetch({ "POST /things": json(401, sessionExpired) })

      expect(await authedFetch("/things", { method: "POST" })).toEqual({
        ok: false,
        kind: "network",
      })
      expect(cookieJar.get("tg_at")?.value).toBe("at-1")
      expect(cookieJar.get("tg_rt")?.value).toBe("rt-1")
      expect(cookieJar.deleteCalls).toEqual([])
    })
  })

  it("returns a business 401 unchanged with no refresh when isSessionFailure is false", async () => {
    const api = mockFetch({ "POST /things": json(401, codeInvalid) })

    const result = await authedFetch("/things", {
      method: "POST",
      isSessionFailure: () => false,
    })

    expect(result).toEqual({
      ok: false,
      kind: "http",
      status: 401,
      error: codeInvalid,
    })
    expect(refreshSession).not.toHaveBeenCalled()
    expect(api.calls("POST /things")).toHaveLength(1)
  })

  it('maps 403 "Email not verified" to email_not_verified', async () => {
    mockFetch({ "POST /things": json(403, notVerified) })

    expect(await authedFetch("/things", { method: "POST" })).toEqual({
      ok: false,
      kind: "email_not_verified",
    })
  })

  it("maps a 403 Email not verified after a refresh-retry too", async () => {
    vi.mocked(refreshSession).mockResolvedValue({ kind: "ok", pair: newPair })
    mockFetch({
      "POST /things": [json(401, sessionExpired), json(403, notVerified)],
    })

    expect(await authedFetch("/things", { method: "POST" })).toEqual({
      ok: false,
      kind: "email_not_verified",
    })
  })

  it("returns any other 403 unchanged", async () => {
    const forbidden = {
      statusCode: 403,
      message: "Forbidden resource",
      error: "Forbidden",
    }
    mockFetch({ "POST /things": json(403, forbidden) })

    expect(await authedFetch("/things", { method: "POST" })).toEqual({
      ok: false,
      kind: "http",
      status: 403,
      error: forbidden,
    })
  })
})
