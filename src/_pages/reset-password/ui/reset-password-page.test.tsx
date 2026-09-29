import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ResetPasswordPage } from "./reset-password-page"

vi.mock("next/headers", () => ({ cookies: vi.fn() }))

describe("ResetPasswordPage", () => {
  it("renders the heading", () => {
    render(<ResetPasswordPage token="tok123" />)

    expect(
      screen.getByRole("heading", { name: "Reset password" })
    ).toBeInTheDocument()
  })

  it("renders two password inputs and a submit button", () => {
    render(<ResetPasswordPage token="tok123" />)

    expect(screen.getByLabelText("New password")).toBeInTheDocument()
    expect(screen.getByLabelText("Confirm new password")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Reset password" })
    ).toBeInTheDocument()
  })

  it("renders a hidden input with the token value", () => {
    const { container } = render(<ResetPasswordPage token="tok123" />)

    const hidden = container.querySelector('input[type="hidden"]')
    expect(hidden).toBeInTheDocument()
    expect(hidden).toHaveValue("tok123")
  })
})
