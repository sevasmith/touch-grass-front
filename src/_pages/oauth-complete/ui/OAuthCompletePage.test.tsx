import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { cookieJar, resetNextHeaders } from "@/test/next-headers.mock"

import { OAuthCompletePage } from "./OAuthCompletePage"

vi.mock("next/headers", () => import("@/test/next-headers.mock"))
const handler = vi.hoisted(() => ({ props: vi.fn() }))
vi.mock("@/features/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/auth")>()),
  OAuthCompleteHandler: (props: unknown) => {
    handler.props(props)
    return null
  },
}))

type SearchParams = Record<string, string | string[] | undefined>

beforeEach(() => {
  resetNextHeaders()
  handler.props.mockReset()
})

async function renderPage(searchParams: SearchParams = {}) {
  render(
    await OAuthCompletePage({ searchParams: Promise.resolve(searchParams) })
  )
}

describe("OAuthCompletePage", () => {
  it("passes the handoff cookie's token to the handler", async () => {
    cookieJar.seed({ tg_oauth_token: "x" })

    await renderPage()

    expect(handler.props).toHaveBeenCalledWith({
      params: { kind: "token", token: "x" },
    })
  })

  it("ignores a token in the URL", async () => {
    await renderPage({ token: "from-url" })

    expect(handler.props).toHaveBeenCalledWith({
      params: { kind: "error", error: "oauth_failed" },
    })
  })

  it("passes oauth_failed when there are no params", async () => {
    await renderPage()

    expect(handler.props).toHaveBeenCalledWith({
      params: { kind: "error", error: "oauth_failed" },
    })
  })

  it("passes a documented error through", async () => {
    await renderPage({ error: "access_denied" })

    expect(handler.props).toHaveBeenCalledWith({
      params: { kind: "error", error: "access_denied" },
    })
  })
})
