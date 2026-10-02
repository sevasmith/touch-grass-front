import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithQueryClient } from "@/test/render-with-query"

import { register } from "../api/register.action"
import { RegisterForm } from "./RegisterForm"

vi.mock("../api/register.action", () => ({ register: vi.fn() }))
const router = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => router }))

const values = {
  email: "ada@example.com",
  password: "correct horse",
  confirmPassword: "correct horse",
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function fillAll(overrides: Partial<typeof values> = {}) {
  const v = { ...values, ...overrides }
  fill("Email", v.email)
  fill("Password", v.password)
  fill("Confirm password", v.confirmPassword)
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Sign Up" }))
}

beforeEach(() => {
  vi.mocked(register).mockReset()
})

describe("RegisterForm — validation", () => {
  it("shows three field errors for an empty submit and does not call the action", async () => {
    renderWithQueryClient(<RegisterForm />)

    submit()

    expect(await screen.findByText("Enter your email")).toBeInTheDocument()
    expect(
      screen.getByText("Password must be 8–72 characters")
    ).toBeInTheDocument()
    expect(screen.getByText("Confirm your password")).toBeInTheDocument()
    expect(register).not.toHaveBeenCalled()
  })

  it("shows the length message for a 7-character password", async () => {
    renderWithQueryClient(<RegisterForm />)

    fillAll({ password: "1234567", confirmPassword: "1234567" })
    submit()

    expect(
      await screen.findByText("Password must be 8–72 characters")
    ).toBeInTheDocument()
    expect(register).not.toHaveBeenCalled()
  })

  it('shows "Passwords don\'t match" for a mismatched confirmation', async () => {
    renderWithQueryClient(<RegisterForm />)

    fillAll({ confirmPassword: "different horse" })
    submit()

    expect(await screen.findByText("Passwords don't match")).toBeInTheDocument()
    expect(screen.getByLabelText("Confirm password")).toHaveAttribute(
      "aria-invalid",
      "true"
    )
  })

  it("uses new-password autocomplete for both password fields", () => {
    renderWithQueryClient(<RegisterForm />)

    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "autocomplete",
      "new-password"
    )
    expect(screen.getByLabelText("Confirm password")).toHaveAttribute(
      "autocomplete",
      "new-password"
    )
  })
})

describe("RegisterForm — submission", () => {
  it("calls the action once with the form values and follows the redirect", async () => {
    vi.mocked(register).mockResolvedValue({ ok: true, redirectTo: "/map" })
    renderWithQueryClient(<RegisterForm />)

    fillAll()
    submit()

    await waitFor(() => expect(register).toHaveBeenCalledTimes(1))
    expect(register).toHaveBeenCalledWith(values)
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/map"))
  })

  it("shows EMAIL_TAKEN on the email field", async () => {
    vi.mocked(register).mockResolvedValue({
      ok: false,
      error: "EMAIL_TAKEN",
      fieldErrors: {
        email: "This email is already registered. Log in instead?",
      },
    })
    renderWithQueryClient(<RegisterForm />)

    fillAll()
    submit()

    const email = screen.getByLabelText("Email")
    await waitFor(() => expect(email).toHaveAttribute("aria-invalid", "true"))
    expect(email).toHaveAccessibleDescription(
      "This email is already registered. Log in instead?"
    )
    expect(
      screen.getAllByText("This email is already registered. Log in instead?")
    ).toHaveLength(1)
  })

  it("disables the button with a spinner while pending", async () => {
    vi.mocked(register).mockReturnValue(new Promise(() => {}))
    renderWithQueryClient(<RegisterForm />)

    fillAll()
    submit()

    const button = screen.getByRole("button", { name: /Sign Up/ })
    await waitFor(() => expect(button).toBeDisabled())
    expect(within(button).getByRole("status")).toBeInTheDocument()
  })

  it("renders other failures as an alert", async () => {
    vi.mocked(register).mockResolvedValue({ ok: false, error: "RATE_LIMITED" })
    renderWithQueryClient(<RegisterForm />)

    fillAll()
    submit()

    const alert = await screen.findByText(
      "Too many requests, please try again later"
    )
    expect(alert.closest("[role=alert]")).toBeInTheDocument()
  })
})
