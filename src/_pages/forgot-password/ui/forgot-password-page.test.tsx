import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ForgotPasswordPage } from "./forgot-password-page"

vi.mock("next/headers", () => ({ cookies: vi.fn() }))

describe("ForgotPasswordPage", () => {
  it("renders the heading", () => {
    render(<ForgotPasswordPage sent={false} />)

    expect(
      screen.getByRole("heading", { name: "Forgot password" })
    ).toBeInTheDocument()
  })

  it("renders an email input and a submit button when sent=false", () => {
    render(<ForgotPasswordPage sent={false} />)

    expect(screen.getByLabelText("Email")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Send reset link" })
    ).toBeInTheDocument()
  })

  it("shows the confirmation message and hides the form when sent=true", () => {
    render(<ForgotPasswordPage sent={true} />)

    expect(
      screen.getByText("Check your email for a reset link.")
    ).toBeInTheDocument()
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Send reset link" })
    ).not.toBeInTheDocument()
  })
})
