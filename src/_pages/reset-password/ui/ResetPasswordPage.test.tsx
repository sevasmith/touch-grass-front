import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ResetPasswordPage } from "./ResetPasswordPage"

const form = vi.hoisted(() => ({ props: vi.fn() }))
vi.mock("@/features/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/auth")>()),
  ResetPasswordForm: (props: { initialToken?: string }) => {
    form.props(props)
    return <div data-testid="reset-form" />
  },
}))

type SearchParams = Record<string, string | string[] | undefined>

async function renderPage(searchParams: SearchParams) {
  render(
    await ResetPasswordPage({ searchParams: Promise.resolve(searchParams) })
  )
}

describe("ResetPasswordPage", () => {
  it("renders the heading and passes the token to the form", async () => {
    await renderPage({ token: "t0k3n" })

    expect(
      screen.getByRole("heading", { level: 1, name: "Set a new password" })
    ).toBeInTheDocument()
    expect(form.props).toHaveBeenLastCalledWith({ initialToken: "t0k3n" })
  })

  it.each<[string, SearchParams]>([
    ["no token", {}],
    ["an empty token", { token: "" }],
    ["an array value", { token: ["a", "b"] }],
  ])("passes no token for %s", async (_, searchParams) => {
    await renderPage(searchParams)

    expect(form.props).toHaveBeenLastCalledWith({ initialToken: undefined })
  })
})
