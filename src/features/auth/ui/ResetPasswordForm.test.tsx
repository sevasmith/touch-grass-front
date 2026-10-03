import { fireEvent, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithQueryClient } from "@/test/render-with-query"

import { resetPassword } from "../api/reset-password.action"
import { AUTH_ERROR_COPY } from "../model/auth-error"
import { ResetPasswordForm } from "./ResetPasswordForm"

vi.mock("../api/reset-password.action", () => ({ resetPassword: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }))

function submitPasswords(password = "new horse", confirmPassword = password) {
  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value: password },
  })
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: confirmPassword },
  })
  fireEvent.click(screen.getByRole("button", { name: "Reset password" }))
}

beforeEach(() => {
  vi.mocked(resetPassword).mockReset()
  vi.spyOn(window.history, "replaceState").mockImplementation(() => {})
})

describe("ResetPasswordForm — token handling", () => {
  it("strips the token from the URL on mount and submits it from state", async () => {
    vi.mocked(resetPassword).mockResolvedValue({ ok: true })
    renderWithQueryClient(<ResetPasswordForm initialToken="t0k3n" />)

    expect(window.history.replaceState).toHaveBeenCalledWith(
      null,
      "",
      "/reset-password"
    )

    submitPasswords()

    await waitFor(() => expect(resetPassword).toHaveBeenCalledTimes(1))
    expect(resetPassword).toHaveBeenCalledWith({
      token: "t0k3n",
      password: "new horse",
      confirmPassword: "new horse",
    })
  })

  it("shows the invalid-link state with a way to request a new link when there is no token", () => {
    renderWithQueryClient(<ResetPasswordForm />)

    expect(screen.getByRole("alert")).toHaveTextContent(
      AUTH_ERROR_COPY.RESET_INVALID
    )
    expect(
      screen.getByRole("link", { name: "Request a new link" })
    ).toHaveAttribute("href", "/forgot-password")
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument()
  })
})

describe("ResetPasswordForm — outcomes", () => {
  it("on success says the user is signed out everywhere and links to log in", async () => {
    vi.mocked(resetPassword).mockResolvedValue({ ok: true })
    renderWithQueryClient(<ResetPasswordForm initialToken="t0k3n" />)

    submitPasswords()

    expect(await screen.findByText(/signed out everywhere/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login"
    )
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument()
  })

  it.each(["RESET_REPLACED", "RESET_EXPIRED", "RESET_INVALID"] as const)(
    "shows distinct copy for %s with a way to request a new link",
    async (error) => {
      vi.mocked(resetPassword).mockResolvedValue({ ok: false, error })
      renderWithQueryClient(<ResetPasswordForm initialToken="t0k3n" />)

      submitPasswords()

      expect(await screen.findByRole("alert")).toHaveTextContent(
        AUTH_ERROR_COPY[error]
      )
      expect(
        screen.getByRole("link", { name: "Request a new link" })
      ).toHaveAttribute("href", "/forgot-password")
    }
  )

  it("shows RESET_ALREADY_USED with its own copy and a way to log in", async () => {
    vi.mocked(resetPassword).mockResolvedValue({
      ok: false,
      error: "RESET_ALREADY_USED",
    })
    renderWithQueryClient(<ResetPasswordForm initialToken="t0k3n" />)

    submitPasswords()

    expect(await screen.findByRole("alert")).toHaveTextContent(
      AUTH_ERROR_COPY.RESET_ALREADY_USED
    )
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login"
    )
    expect(
      screen.queryByRole("link", { name: "Request a new link" })
    ).not.toBeInTheDocument()
  })

  it("puts RESET_SAME_PASSWORD on the password field and keeps the form", async () => {
    vi.mocked(resetPassword).mockResolvedValue({
      ok: false,
      error: "RESET_SAME_PASSWORD",
      fieldErrors: { password: AUTH_ERROR_COPY.RESET_SAME_PASSWORD },
    })
    renderWithQueryClient(<ResetPasswordForm initialToken="t0k3n" />)

    submitPasswords()

    const password = screen.getByLabelText("New password")
    await waitFor(() =>
      expect(password).toHaveAttribute("aria-invalid", "true")
    )
    expect(password).toHaveAccessibleDescription(
      AUTH_ERROR_COPY.RESET_SAME_PASSWORD
    )
  })

  it("validates the passwords before calling the action", async () => {
    renderWithQueryClient(<ResetPasswordForm initialToken="t0k3n" />)

    submitPasswords("new horse", "other horse")

    expect(await screen.findByText("Passwords don't match")).toBeInTheDocument()
    expect(resetPassword).not.toHaveBeenCalled()
  })
})
