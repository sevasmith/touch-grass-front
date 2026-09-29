import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { register } from "../api/actions"
import { RegisterForm } from "./register-form"

vi.mock("../api/actions", () => ({ register: vi.fn() }))

const registerMock = vi.mocked(register)

function renderRegisterForm() {
  const utils = render(<RegisterForm />)
  const form = utils.container.querySelector("form") as HTMLFormElement
  return { ...utils, form }
}

function fillForm(email: string, password: string, confirmPassword: string) {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } })
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: password },
  })
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: confirmPassword },
  })
}

beforeEach(() => {
  registerMock.mockReset()
})

describe("RegisterForm", () => {
  it("renders email, password, confirm password inputs and a Sign Up button", () => {
    render(<RegisterForm />)

    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email")
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "type",
      "password"
    )
    expect(screen.getByLabelText("Confirm password")).toHaveAttribute(
      "type",
      "password"
    )
    expect(screen.getByRole("button", { name: "Sign Up" })).toBeInTheDocument()
  })

  it("shows field errors and does not call register when submitted empty", async () => {
    const { form } = renderRegisterForm()

    fireEvent.submit(form)

    expect(
      await screen.findByText("Password must be at least 8 characters")
    ).toBeInTheDocument()
    expect(registerMock).not.toHaveBeenCalled()
  })

  it("shows a mismatch error and does not call register when passwords differ", async () => {
    const { form } = renderRegisterForm()

    fillForm("user@example.com", "password123", "password456")
    fireEvent.submit(form)

    expect(
      await screen.findByText("Passwords do not match")
    ).toBeInTheDocument()
    expect(registerMock).not.toHaveBeenCalled()
  })

  it("calls register with the submitted email and passwords when valid", async () => {
    const { form } = renderRegisterForm()

    fillForm("user@example.com", "password123", "password123")
    fireEvent.submit(form)

    await waitFor(() => expect(registerMock).toHaveBeenCalledTimes(1))
    const formData = registerMock.mock.calls[0][1]
    expect(formData.get("email")).toBe("user@example.com")
    expect(formData.get("password")).toBe("password123")
    expect(formData.get("confirmPassword")).toBe("password123")
  })

  it("renders a server field error for an existing email", async () => {
    registerMock.mockResolvedValueOnce({
      fieldErrors: { email: ["An account with this email already exists"] },
    })

    const { form } = renderRegisterForm()

    fillForm("user@example.com", "password123", "password123")
    fireEvent.submit(form)

    expect(
      await screen.findByText("An account with this email already exists")
    ).toBeInTheDocument()
  })
})
