import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { OAuthCompletePage } from "./OAuthCompletePage"

const handler = vi.hoisted(() => ({ props: vi.fn() }))
vi.mock("@/features/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/auth")>()),
  OAuthCompleteHandler: (props: unknown) => {
    handler.props(props)
    return null
  },
}))

type SearchParams = Record<string, string | string[] | undefined>

async function renderPage(searchParams: SearchParams) {
  render(
    await OAuthCompletePage({ searchParams: Promise.resolve(searchParams) })
  )
}

describe("OAuthCompletePage", () => {
  it("passes a token to the handler", async () => {
    await renderPage({ token: "x" })

    expect(handler.props).toHaveBeenCalledWith({
      params: { kind: "token", token: "x" },
    })
  })

  it("passes oauth_failed when there are no params", async () => {
    await renderPage({})

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
