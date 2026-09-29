import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { CheckEmailPage } from "./check-email-page"

vi.mock("next/headers", () => ({ cookies: vi.fn() }))

describe("CheckEmailPage", () => {
  it("renders the heading", () => {
    render(<CheckEmailPage />)

    expect(
      screen.getByRole("heading", { name: "Check your email" })
    ).toBeInTheDocument()
  })

  it("renders the resend button", () => {
    render(<CheckEmailPage />)

    expect(
      screen.getByRole("button", { name: "Resend verification email" })
    ).toBeInTheDocument()
  })

  it("renders the log out button", () => {
    render(<CheckEmailPage />)

    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument()
  })
})
