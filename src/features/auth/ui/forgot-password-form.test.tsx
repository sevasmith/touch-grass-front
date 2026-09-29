import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { forgotPassword } from "../api/actions"
import { ForgotPasswordForm } from "./forgot-password-form"

vi.mock("../api/actions", () => ({
  forgotPassword: vi.fn(),
}))

const forgotMock = vi.mocked(forgotPassword)

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    forgotMock.mockReset()
  })

  it("renders an email input and a submit button", () => {
    render(<ForgotPasswordForm />)

    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email")
    expect(
      screen.getByRole("button", { name: "Send reset link" })
    ).toBeInTheDocument()
  })

  it("shows a field error and does not call the action on empty submit", async () => {
    render(<ForgotPasswordForm />)

    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }))

    expect(await screen.findByRole("alert")).toBeInTheDocument()
    expect(forgotMock).not.toHaveBeenCalled()
  })

  it("submits the typed email to the action", async () => {
    render(<ForgotPasswordForm />)

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }))

    await waitFor(() => expect(forgotMock).toHaveBeenCalledTimes(1))
    const formData = forgotMock.mock.calls[0][1]
    expect(formData).toBeInstanceOf(FormData)
    expect(formData.get("email")).toBe("user@example.com")
  })

  it("shows a form-level error returned by the action", async () => {
    forgotMock.mockResolvedValueOnce({
      formError: "Service unavailable. Please try again later.",
    })

    render(<ForgotPasswordForm />)

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }))

    expect(
      await screen.findByText("Service unavailable. Please try again later.")
    ).toBeInTheDocument()
  })
})
