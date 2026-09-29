import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { login } from "../api/actions"
import { LoginForm } from "./login-form"

vi.mock("../api/actions", () => ({ login: vi.fn() }))

const loginMock = vi.mocked(login)

describe("LoginForm", () => {
  beforeEach(() => {
    loginMock.mockReset()
  })

  it("renders email, password, and submit controls", () => {
    render(<LoginForm />)

    expect(screen.getByLabelText("Email")).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument()
  })

  it("shows field errors and does not call login when submitting empty", async () => {
    const { container } = render(<LoginForm />)

    fireEvent.submit(container.querySelector("form")!)

    expect(await screen.findByText("Invalid email address")).toBeInTheDocument()
    expect(screen.getByText("Password is required")).toBeInTheDocument()
    expect(loginMock).not.toHaveBeenCalled()
  })

  it("calls login with a FormData containing the typed email", async () => {
    const { container } = render(<LoginForm />)

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    })
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    })
    fireEvent.submit(container.querySelector("form")!)

    await waitFor(() => expect(loginMock).toHaveBeenCalledTimes(1))

    const formData = loginMock.mock.calls[0][1]
    expect(formData).toBeInstanceOf(FormData)
    expect(formData.get("email")).toBe("user@example.com")
    expect(formData.get("password")).toBe("password123")
  })

  it("shows the server form error after a rejected login", async () => {
    loginMock.mockResolvedValueOnce({ formError: "Invalid email or password" })
    const { container } = render(<LoginForm />)

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    })
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    })
    fireEvent.submit(container.querySelector("form")!)

    expect(
      await screen.findByText("Invalid email or password")
    ).toBeInTheDocument()
  })
})
