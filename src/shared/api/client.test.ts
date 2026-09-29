import { beforeEach, describe, expect, it, vi } from "vitest"

import { apiFetch } from "./client"
import { getSessionToken } from "./session"

vi.mock("./session", () => ({ getSessionToken: vi.fn() }))

const getSessionTokenMock = vi.mocked(getSessionToken)
const fetchMock = vi.fn()

vi.stubGlobal("fetch", fetchMock)

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

describe("apiFetch", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    getSessionTokenMock.mockReset()
    getSessionTokenMock.mockResolvedValue(undefined)
  })

  it("attaches Authorization: Bearer <token> when a token is present", async () => {
    getSessionTokenMock.mockResolvedValue("tok-123")
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }))

    await apiFetch<{ ok: boolean }>("/me")

    const init = fetchMock.mock.calls[0][1] as RequestInit
    const headers = init.headers as Headers
    expect(headers.get("Authorization")).toBe("Bearer tok-123")
  })

  it("omits the Authorization header when no token is present", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }))

    await apiFetch<{ ok: boolean }>("/me")

    const init = fetchMock.mock.calls[0][1] as RequestInit
    const headers = init.headers as Headers
    expect(headers.get("Authorization")).toBeNull()
  })

  it("returns parsed JSON on 200", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: 1, name: "Ada" }))

    await expect(
      apiFetch<{ id: number; name: string }>("/users/1")
    ).resolves.toEqual({
      id: 1,
      name: "Ada",
    })
  })

  it("returns undefined on 204", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    await expect(apiFetch<void>("/logout")).resolves.toBeUndefined()
  })

  it("throws ApiError with status and parsed body on error responses", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, { message: "Unauthorized", code: "UNAUTHORIZED" })
    )

    await expect(apiFetch("/me")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      body: { message: "Unauthorized", code: "UNAUTHORIZED" },
    })
  })

  it("throws ApiError with status 0 when fetch rejects (network error)", async () => {
    fetchMock.mockRejectedValue(new Error("connection refused"))

    await expect(apiFetch("/me")).rejects.toMatchObject({
      name: "ApiError",
      status: 0,
      body: { message: "Network error" },
    })
  })
})
