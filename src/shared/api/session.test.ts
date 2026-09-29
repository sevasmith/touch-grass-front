import { cookies } from "next/headers"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  clearSessionToken,
  getSessionToken,
  SESSION_COOKIE,
  setSessionToken,
} from "./session"

vi.mock("next/headers", () => ({ cookies: vi.fn() }))

const cookiesMock = vi.mocked(cookies)

describe("session cookie helpers", () => {
  beforeEach(() => {
    cookiesMock.mockReset()
  })

  describe("getSessionToken", () => {
    it("returns undefined when the cookie is absent", async () => {
      cookiesMock.mockResolvedValue({
        get: vi.fn().mockReturnValue(undefined),
      } as never)

      await expect(getSessionToken()).resolves.toBeUndefined()
    })

    it("returns the cookie value when present", async () => {
      cookiesMock.mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "token-123" }),
      } as never)

      await expect(getSessionToken()).resolves.toBe("token-123")
    })
  })

  describe("setSessionToken", () => {
    it("sets the session cookie with secure options", async () => {
      const set = vi.fn()
      cookiesMock.mockResolvedValue({ set } as never)

      await setSessionToken("token-456")

      expect(set).toHaveBeenCalledWith(
        SESSION_COOKIE,
        "token-456",
        expect.objectContaining({ httpOnly: true, path: "/" })
      )
    })
  })

  describe("clearSessionToken", () => {
    it("deletes the session cookie", async () => {
      const deleteCookie = vi.fn()
      cookiesMock.mockResolvedValue({ delete: deleteCookie } as never)

      await clearSessionToken()

      expect(deleteCookie).toHaveBeenCalledWith(SESSION_COOKIE)
    })
  })
})
