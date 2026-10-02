import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { LoginPage } from "./LoginPage"

vi.mock("@/features/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/auth")>()),
  LoginForm: () => <div data-testid="login-form" />,
}))

type SearchParams = Record<string, string | string[] | undefined>

async function renderPage(searchParams: SearchParams = {}) {
  render(await LoginPage({ searchParams: Promise.resolve(searchParams) }))
}

const NOTICE = "Your session has ended. Please log in again."

describe("LoginPage", () => {
  it("renders the Figma heading, subtitle and the login form", async () => {
    await renderPage()

    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome to Touch Grass" })
    ).toBeInTheDocument()
    expect(
      screen.getByText("Sign in to continue your journey.")
    ).toBeInTheDocument()
    expect(screen.getByTestId("login-form")).toBeInTheDocument()
  })

  it("shows the session-expired notice for reason=session_expired", async () => {
    await renderPage({ reason: "session_expired" })

    expect(screen.getByText(NOTICE)).toBeInTheDocument()
  })

  it.each<[string, SearchParams]>([
    ["no reason", {}],
    ["an unknown reason", { reason: "hacked" }],
    ["an array value", { reason: ["session_expired", "session_expired"] }],
  ])("shows no notice for %s", async (_, searchParams) => {
    await renderPage(searchParams)

    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument()
  })
})
