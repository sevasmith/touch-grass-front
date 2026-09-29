import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { resetPassword } from "../api/actions"
import { ResetPasswordForm } from "./reset-password-form"

vi.mock("../api/actions", () => ({
  resetPassword: vi.fn(),
}))

const resetMock = vi.mocked(resetPassword)

const TOKEN = "reset-token"

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    resetMock.mockReset()
  })

  it("renders two password inputs and a submit button", () => {
    render(<ResetPasswordForm token={TOKEN} />)

    expect(screen.getByLabelText("New password")).toHaveAttribute(
      "type",
      "password"
    )
    expect(screen.getByLabelText("Confirm new password")).toHaveAttribute(
      "type",
      "password"
    )
    expect(
      screen.getByRole("button", { name: "Reset password" })
    ).toBeInTheDocument()
  })

  it("shows a field error and does not call the action on empty submit", async () => {
    render(<ResetPasswordForm token={TOKEN} />)

    fireEvent.click(screen.getByRole("button", { name: "Reset password" }))

    expect(await screen.findByRole("alert")).toBeInTheDocument()
    expect(resetMock).not.toHaveBeenCalled()
  })

  it("shows a mismatch error and does not call the action", async () => {
    render(<ResetPasswordForm token={TOKEN} />)

    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "password123" },
    })
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "password456" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Reset password" }))

    expect(
      await screen.findByText("Passwords do not match")
    ).toBeInTheDocument()
    expect(resetMock).not.toHaveBeenCalled()
  })

  it("submits the token and passwords to the action", async () => {
    render(<ResetPasswordForm token={TOKEN} />)

    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "password123" },
    })
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "password123" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Reset password" }))

    await waitFor(() => expect(resetMock).toHaveBeenCalledTimes(1))
    const formData = resetMock.mock.calls[0][1]
    expect(formData).toBeInstanceOf(FormData)
    expect(formData.get("token")).toBe(TOKEN)
    expect(formData.get("password")).toBe("password123")
    expect(formData.get("confirmPassword")).toBe("password123")
  })
})
