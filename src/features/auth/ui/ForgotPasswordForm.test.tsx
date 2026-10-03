import { fireEvent, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithQueryClient } from "@/test/render-with-query"

import { forgotPassword } from "../api/forgot-password.action"
import { FORGOT_PASSWORD_CONFIRMATION } from "../config/forgot-password"
import { ForgotPasswordForm } from "./ForgotPasswordForm"

vi.mock("../api/forgot-password.action", () => ({ forgotPassword: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }))

function submitEmail(email: string) {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } })
  fireEvent.click(screen.getByRole("button", { name: "Send reset link" }))
}

beforeEach(() => {
  vi.mocked(forgotPassword).mockReset()
})

describe("ForgotPasswordForm", () => {
  it("replaces the form with the exact constant confirmation and a way back", async () => {
    vi.mocked(forgotPassword).mockResolvedValue({ ok: true })
    renderWithQueryClient(<ForgotPasswordForm />)

    submitEmail("ada@example.com")

    expect(
      await screen.findByText(FORGOT_PASSWORD_CONFIRMATION)
    ).toBeInTheDocument()
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Back to log in" })
    ).toHaveAttribute("href", "/login")
    expect(forgotPassword).toHaveBeenCalledWith({ email: "ada@example.com" })
  })

  it("renders byte-identical output for a registered and an unregistered email (SC-008)", async () => {
    vi.mocked(forgotPassword).mockResolvedValue({ ok: true })

    const first = renderWithQueryClient(<ForgotPasswordForm />)
    submitEmail("registered@example.com")
    await screen.findByText(FORGOT_PASSWORD_CONFIRMATION)
    const firstHtml = first.container.innerHTML
    first.unmount()

    const second = renderWithQueryClient(<ForgotPasswordForm />)
    submitEmail("nobody@example.com")
    await screen.findByText(FORGOT_PASSWORD_CONFIRMATION)

    expect(second.container.innerHTML).toBe(firstHtml)
    expect(firstHtml).not.toContain("registered@example.com")
  })

  it("shows RATE_LIMITED and keeps the form", async () => {
    vi.mocked(forgotPassword).mockResolvedValue({
      ok: false,
      error: "RATE_LIMITED",
    })
    renderWithQueryClient(<ForgotPasswordForm />)

    submitEmail("ada@example.com")

    expect(
      await screen.findByText("Too many requests, please try again later")
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toBeInTheDocument()
  })

  it("disables the button while pending", async () => {
    vi.mocked(forgotPassword).mockReturnValue(new Promise(() => {}))
    renderWithQueryClient(<ForgotPasswordForm />)

    submitEmail("ada@example.com")

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Send reset link/ })
      ).toBeDisabled()
    )
  })

  it("validates the email before calling the action", async () => {
    renderWithQueryClient(<ForgotPasswordForm />)

    submitEmail("ada")

    expect(
      await screen.findByText("Enter a valid email address")
    ).toBeInTheDocument()
    expect(forgotPassword).not.toHaveBeenCalled()
  })
})
