// @vitest-environment node
import { NextRequest, type NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { json, mockFetch } from "@/test/fetch.mock"
import { resetNextHeaders } from "@/test/next-headers.mock"

import { proxy } from "./proxy"

vi.mock("next/headers", () => import("@/test/next-headers.mock"))

const ORIGIN = "http://localhost:3000"
const SESSION = "tg_at=at-1; tg_rt=rt-1"
const newPair = { accessToken: "at-2", refreshToken: "rt-2" }
const unauthorized = {
  statusCode: 401,
  message: "Unauthorized",
  error: "Unauthorized",
}

function me(emailVerified: boolean) {
  return json(200, {
    id: "3f1c2b9a-6a0e-4c8f-9b7d-2e5a1c4d8f00",
    email: "ada@example.com",
    emailVerified,
  })
}

function request(
  path: string,
  {
    cookie,
    method = "GET",
    headers = {},
  }: {
    cookie?: string
    method?: string
    headers?: Record<string, string>
  } = {}
) {
  return new NextRequest(`${ORIGIN}${path}`, {
    method,
    headers: { ...headers, ...(cookie ? { cookie } : {}) },
  })
}

function expectPassThrough(response: NextResponse) {
  expect(response.headers.get("x-middleware-next")).toBe("1")
}

function expectRedirect(response: NextResponse, location: string) {
  expect(response.status).toBe(307)
  expect(response.headers.get("location")).toBe(`${ORIGIN}${location}`)
}

function expectSessionCleared(response: NextResponse) {
  for (const name of ["tg_at", "tg_rt", "tg_code_sent_at"]) {
    expect(response.cookies.get(name)?.value).toBe("")
  }
}

function expectNewPairOnResponse(response: NextResponse) {
  expect(response.cookies.get("tg_at")).toMatchObject({
    value: "at-2",
    httpOnly: true,
  })
  expect(response.cookies.get("tg_rt")).toMatchObject({
    value: "rt-2",
    httpOnly: true,
  })
}

function expectUntouchedCookies(response: NextResponse) {
  expect(response.cookies.getAll()).toEqual([])
}

beforeEach(() => {
  const globals = globalThis as Record<string, unknown>
  delete globals.__touchGrassMemoryKv
  delete globals.__touchGrassKvStore
  resetNextHeaders()
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("proxy — requests it never inspects", () => {
  it.each(["POST", "PUT", "DELETE"])(
    "passes a %s request through",
    async (method) => {
      const api = mockFetch({})

      expectPassThrough(await proxy(request("/map", { method })))
      expect(api.calls()).toHaveLength(0)
    }
  )

  it("passes a Server Action request (Next-Action header) through", async () => {
    const api = mockFetch({})

    const response = await proxy(
      request("/map", { headers: { "Next-Action": "abc123" } })
    )

    expectPassThrough(response)
    expect(api.calls()).toHaveLength(0)
  })
})

describe("proxy — public routes", () => {
  it.each([
    "/forgot-password",
    "/reset-password",
    "/oauth/complete",
    "/session-unavailable",
  ])(
    "passes %s through without a backend call, even with a session",
    async (path) => {
      const api = mockFetch({})

      expectPassThrough(await proxy(request(path, { cookie: SESSION })))
      expect(api.calls()).toHaveLength(0)
    }
  )

  it.each(["/login", "/register"])(
    "passes %s through without a session",
    async (path) => {
      const api = mockFetch({})

      expectPassThrough(await proxy(request(path)))
      expect(api.calls()).toHaveLength(0)
    }
  )

  describe.each(["/login", "/register"])("%s with a session", (path) => {
    it("redirects a verified user to /map", async () => {
      mockFetch({ "GET /auth/me": me(true) })

      expectRedirect(await proxy(request(path, { cookie: SESSION })), "/map")
    })

    it("redirects an unverified user to /verify-email", async () => {
      mockFetch({ "GET /auth/me": me(false) })

      expectRedirect(
        await proxy(request(path, { cookie: SESSION })),
        "/verify-email"
      )
    })

    it("deletes the cookies and passes through when the session is revoked", async () => {
      mockFetch({
        "GET /auth/me": json(401, unauthorized),
        "POST /auth/refresh": json(401, unauthorized),
      })

      const response = await proxy(request(path, { cookie: SESSION }))

      expectPassThrough(response)
      expectSessionCleared(response)
    })

    it("passes through when the session check is transient", async () => {
      mockFetch({ "GET /auth/me": json(503) })

      const response = await proxy(request(path, { cookie: SESSION }))

      expectPassThrough(response)
      expectUntouchedCookies(response)
    })
  })
})

describe("proxy — protected routes", () => {
  it.each(["/map", "/verify-email", "/"])(
    "redirects %s to /login without a session",
    async (path) => {
      const api = mockFetch({})

      expectRedirect(await proxy(request(path)), "/login")
      expect(api.calls()).toHaveLength(0)
    }
  )

  it("redirects to /login when only one session cookie is present", async () => {
    expectRedirect(
      await proxy(request("/map", { cookie: "tg_at=at-1" })),
      "/login"
    )
  })

  it("passes a verified user through on /map", async () => {
    const api = mockFetch({ "GET /auth/me": me(true) })

    const response = await proxy(request("/map", { cookie: SESSION }))

    expectPassThrough(response)
    expect(api.calls("GET /auth/me")[0].headers.get("authorization")).toBe(
      "Bearer at-1"
    )
  })

  it("redirects an unverified user on /map to /verify-email", async () => {
    mockFetch({ "GET /auth/me": me(false) })

    expectRedirect(
      await proxy(request("/map", { cookie: SESSION })),
      "/verify-email"
    )
  })

  it("passes an unverified user through on /verify-email", async () => {
    mockFetch({ "GET /auth/me": me(false) })

    expectPassThrough(
      await proxy(request("/verify-email", { cookie: SESSION }))
    )
  })

  it("redirects a verified user on /verify-email to /map", async () => {
    mockFetch({ "GET /auth/me": me(true) })

    expectRedirect(
      await proxy(request("/verify-email", { cookie: SESSION })),
      "/map"
    )
  })

  describe("when /auth/me answers 401", () => {
    it("refreshes, retries /auth/me once with the new token, and forwards the new pair", async () => {
      const api = mockFetch({
        "GET /auth/me": [json(401, unauthorized), me(true)],
        "POST /auth/refresh": json(200, newPair),
      })

      const response = await proxy(request("/map", { cookie: SESSION }))

      expectPassThrough(response)
      expect(api.calls("POST /auth/refresh")).toHaveLength(1)
      expect(api.calls("POST /auth/refresh")[0].body).toEqual({
        refreshToken: "rt-1",
      })
      expect(api.calls("GET /auth/me")).toHaveLength(2)
      expect(api.calls("GET /auth/me")[1].headers.get("authorization")).toBe(
        "Bearer at-2"
      )
      expectNewPairOnResponse(response)
      const forwardedCookie =
        response.headers.get("x-middleware-request-cookie") ?? ""
      expect(forwardedCookie).toContain("tg_at=at-2")
      expect(forwardedCookie).toContain("tg_rt=rt-2")
    })

    it("sets the new pair on a redirect too", async () => {
      mockFetch({
        "GET /auth/me": [json(401, unauthorized), me(false)],
        "POST /auth/refresh": json(200, newPair),
      })

      const response = await proxy(request("/map", { cookie: SESSION }))

      expectRedirect(response, "/verify-email")
      expectNewPairOnResponse(response)
    })

    it("redirects to /login?reason=session_expired and deletes every tg_ cookie when revoked", async () => {
      mockFetch({
        "GET /auth/me": json(401, unauthorized),
        "POST /auth/refresh": json(401, unauthorized),
      })

      const response = await proxy(request("/map", { cookie: SESSION }))

      expectRedirect(response, "/login?reason=session_expired")
      expectSessionCleared(response)
    })

    it("treats a 401 from the retried /auth/me as revoked", async () => {
      mockFetch({
        "GET /auth/me": json(401, unauthorized),
        "POST /auth/refresh": json(200, newPair),
      })

      const response = await proxy(request("/map", { cookie: SESSION }))

      expectRedirect(response, "/login?reason=session_expired")
      expectSessionCleared(response)
    })

    it("rewrites to /session-unavailable and keeps the cookies when the refresh is transient", async () => {
      mockFetch({
        "GET /auth/me": json(401, unauthorized),
        "POST /auth/refresh": json(503),
      })

      const response = await proxy(request("/map", { cookie: SESSION }))

      expect(response.headers.get("x-middleware-rewrite")).toBe(
        `${ORIGIN}/session-unavailable`
      )
      expect(response.headers.get("location")).toBeNull()
      expectUntouchedCookies(response)
    })

    it("still persists a rotated pair when the retried /auth/me is transient", async () => {
      mockFetch({
        "GET /auth/me": [json(401, unauthorized), json(503)],
        "POST /auth/refresh": json(200, newPair),
      })

      const response = await proxy(request("/map", { cookie: SESSION }))

      expect(response.headers.get("x-middleware-rewrite")).toBe(
        `${ORIGIN}/session-unavailable`
      )
      expectNewPairOnResponse(response)
    })
  })

  it.each([
    ["a 5xx", json(503)],
    ["a 429", json(429)],
    ["a network failure", new TypeError("fetch failed")],
  ])(
    "rewrites to /session-unavailable on %s with URL and cookies unchanged",
    async (_, response) => {
      mockFetch({ "GET /auth/me": response })

      const result = await proxy(request("/map", { cookie: SESSION }))

      expect(result.headers.get("x-middleware-rewrite")).toBe(
        `${ORIGIN}/session-unavailable`
      )
      expect(result.headers.get("location")).toBeNull()
      expectUntouchedCookies(result)
    }
  )
})
