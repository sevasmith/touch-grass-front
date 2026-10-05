import { StrictMode } from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { exchangeOAuthToken } from "../api/exchange-oauth-token.action"
import { AUTH_ERROR_COPY } from "../model/auth-error"
import type { OAuthCompleteParams } from "../model/oauth-complete-params.schema"
import { OAuthCompleteHandler } from "./OAuthCompleteHandler"

vi.mock("../api/exchange-oauth-token.action", () => ({
  exchangeOAuthToken: vi.fn(),
}))
const router = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => router }))

function renderStrict(params: OAuthCompleteParams) {
  return render(
    <StrictMode>
      <OAuthCompleteHandler params={params} />
    </StrictMode>
  )
}

beforeEach(() => {
  vi.mocked(exchangeOAuthToken).mockReset()
  vi.spyOn(console, "error").mockImplementation(() => {})
})

function exchangeResolvesTo(
  result: Awaited<ReturnType<typeof exchangeOAuthToken>>
) {
  vi.mocked(exchangeOAuthToken).mockResolvedValue(result)
}

describe("OAuthCompleteHandler — token", () => {
  it("exchanges exactly once under StrictMode", async () => {
    exchangeResolvesTo({ ok: true, redirectTo: "/map" })

    renderStrict({ kind: "token", token: "handoff" })

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/map"))
    expect(exchangeOAuthToken).toHaveBeenCalledTimes(1)
    expect(exchangeOAuthToken).toHaveBeenCalledWith({ token: "handoff" })
  })

  it('shows "Signing you in…" with a spinner while exchanging', () => {
    vi.mocked(exchangeOAuthToken).mockReturnValue(new Promise(() => {}))

    renderStrict({ kind: "token", token: "handoff" })

    expect(screen.getByText("Signing you in…")).toBeInTheDocument()
    expect(screen.getByRole("status")).toBeInTheDocument()
  })

  it.each([
    ["OAUTH_FAILED", AUTH_ERROR_COPY.OAUTH_FAILED],
    ["OAUTH_RATE_LIMITED", AUTH_ERROR_COPY.OAUTH_RATE_LIMITED],
    ["NETWORK_ERROR", AUTH_ERROR_COPY.NETWORK_ERROR],
  ] as const)("shows the error card for %s", async (error, copy) => {
    exchangeResolvesTo({ ok: false, error })

    renderStrict({ kind: "token", token: "handoff" })

    expect(await screen.findByRole("alert")).toHaveTextContent(copy)
    expect(screen.getByRole("link", { name: "Try again" })).toBeInTheDocument()
    expect(screen.queryByText("Signing you in…")).not.toBeInTheDocument()
    expect(router.replace).not.toHaveBeenCalled()
  })

  it("shows NETWORK_ERROR when the action call rejects, still calling it once", async () => {
    vi.mocked(exchangeOAuthToken).mockRejectedValue(
      new Error("Failed to find Server Action")
    )

    renderStrict({ kind: "token", token: "handoff" })

    expect(await screen.findByRole("alert")).toHaveTextContent(
      AUTH_ERROR_COPY.NETWORK_ERROR
    )
    expect(screen.queryByText("Signing you in…")).not.toBeInTheDocument()
    expect(exchangeOAuthToken).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalled()
  })
})

describe("OAuthCompleteHandler — error param", () => {
  it.each([
    ["access_denied", AUTH_ERROR_COPY.OAUTH_ACCESS_DENIED],
    ["email_already_in_use", AUTH_ERROR_COPY.OAUTH_EMAIL_IN_USE],
    ["too_many_requests", AUTH_ERROR_COPY.OAUTH_RATE_LIMITED],
    ["oauth_failed", AUTH_ERROR_COPY.OAUTH_FAILED],
  ] as const)("maps %s to its message and never exchanges", (error, copy) => {
    renderStrict({ kind: "error", error })

    expect(screen.getByRole("alert")).toHaveTextContent(copy)
    expect(exchangeOAuthToken).not.toHaveBeenCalled()
  })
})
