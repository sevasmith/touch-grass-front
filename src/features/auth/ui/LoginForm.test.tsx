import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithQueryClient } from "@/test/render-with-query"

import { login } from "../api/login.action"
import { LoginForm } from "./LoginForm"

vi.mock("../api/login.action", () => ({ login: vi.fn() }))
const router = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => router }))

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Log In" }))
}

function fillValid() {
  fill("Email", "ada@example.com")
  fill("Password", "correct horse")
}

beforeEach(() => {
  vi.mocked(login).mockReset()
})

describe("LoginForm — validation", () => {
  it("shows errors on both fields for an empty submit and does not call the action", async () => {
    renderWithQueryClient(<LoginForm />)

    submit()

    expect(await screen.findByText("Enter your email")).toBeInTheDocument()
    expect(screen.getByText("Enter your password")).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it("shows an invalid email error on blur", async () => {
    renderWithQueryClient(<LoginForm />)

    fill("Email", "ada")
    fireEvent.blur(screen.getByLabelText("Email"))

    expect(
      await screen.findByText("Enter a valid email address")
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-invalid",
      "true"
    )
  })
})

describe("LoginForm — submission", () => {
  it("calls the action once with the email and password", async () => {
    vi.mocked(login).mockResolvedValue({ ok: true, redirectTo: "/map" })
    renderWithQueryClient(<LoginForm />)

    fillValid()
    submit()

    await waitFor(() => expect(login).toHaveBeenCalledTimes(1))
    expect(login).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "correct horse",
    })
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/map"))
  })

  it("disables the button and shows a spinner while pending", async () => {
    vi.mocked(login).mockReturnValue(new Promise(() => {}))
    renderWithQueryClient(<LoginForm />)

    fillValid()
    submit()

    const button = await screen.findByRole("button", { name: /Log In/ })
    await waitFor(() => expect(button).toBeDisabled())
    expect(within(button).getByRole("status")).toBeInTheDocument()
  })

  it.each([
    ["INVALID_CREDENTIALS", "Invalid email or password"],
    ["TOO_MANY_ATTEMPTS", "Too many attempts, please wait a moment"],
  ] as const)("renders %s as an alert", async (error, copy) => {
    vi.mocked(login).mockResolvedValue({ ok: false, error })
    renderWithQueryClient(<LoginForm />)

    fillValid()
    submit()

    const alert = await screen.findByText(copy)
    expect(alert.closest("[role=alert]")).toBeInTheDocument()
  })

  it("leaves the form enabled for a retry after NETWORK_ERROR", async () => {
    vi.mocked(login).mockResolvedValue({ ok: false, error: "NETWORK_ERROR" })
    renderWithQueryClient(<LoginForm />)

    fillValid()
    submit()

    expect(
      await screen.findByText(
        "We couldn't reach Touch Grass. Check your connection and try again."
      )
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Log In" })).toBeEnabled()
    expect(screen.getByLabelText("Email")).toBeEnabled()
    expect(screen.getByLabelText("Password")).toBeEnabled()
  })

  it("shows server-side field errors on their fields", async () => {
    vi.mocked(login).mockResolvedValue({
      ok: false,
      error: "VALIDATION",
      fieldErrors: { email: "Enter a valid email address" },
    })
    renderWithQueryClient(<LoginForm />)

    fillValid()
    submit()

    expect(
      await screen.findByText("Enter a valid email address")
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-invalid",
      "true"
    )
  })
})
