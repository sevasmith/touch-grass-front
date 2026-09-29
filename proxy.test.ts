import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"

import { proxy } from "./proxy"

function makeRequest(pathname: string, withSession = false): NextRequest {
  const request = new NextRequest(`http://localhost${pathname}`)
  if (withSession) {
    request.cookies.set("session", "token")
  }
  return request
}

describe("proxy", () => {
  describe("unauthenticated", () => {
    it("redirects to /login for the protected route", () => {
      const res = proxy(makeRequest("/dashboard"))
      expect(res.status).toBe(307)
      expect(res.headers.get("location")).toBe("http://localhost/login")
    })

    it("redirects to /login for a nested protected route", () => {
      const res = proxy(makeRequest("/dashboard/settings"))
      expect(res.status).toBe(307)
      expect(res.headers.get("location")).toBe("http://localhost/login")
    })

    it("passes through for a public route", () => {
      const res = proxy(makeRequest("/login"))
      expect(res.status).toBe(200)
      expect(res.headers.get("location")).toBeNull()
    })
  })

  describe("authenticated", () => {
    it("redirects to /dashboard for a public route", () => {
      const res = proxy(makeRequest("/login", true))
      expect(res.status).toBe(307)
      expect(res.headers.get("location")).toBe("http://localhost/dashboard")
    })

    it("redirects to /dashboard for every public route", () => {
      for (const route of [
        "/register",
        "/forgot-password",
        "/reset-password",
        "/check-email",
      ]) {
        const res = proxy(makeRequest(route, true))
        expect(res.status).toBe(307)
        expect(res.headers.get("location")).toBe("http://localhost/dashboard")
      }
    })

    it("passes through for a protected route", () => {
      const res = proxy(makeRequest("/dashboard", true))
      expect(res.status).toBe(200)
      expect(res.headers.get("location")).toBeNull()
    })
  })
})
