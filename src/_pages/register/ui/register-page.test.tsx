import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { RegisterPage } from "./register-page"

vi.mock("next/headers", () => ({ cookies: vi.fn() }))

describe("RegisterPage", () => {
  it("renders the create-account heading", () => {
    render(<RegisterPage />)

    expect(
      screen.getByRole("heading", { name: "Create your account" })
    ).toBeInTheDocument()
  })

  it("renders an email input and a Sign Up button", () => {
    render(<RegisterPage />)

    expect(screen.getByLabelText("Email")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sign Up" })).toBeInTheDocument()
  })

  it("renders a Log in link to /login", () => {
    render(<RegisterPage />)

    const link = screen.getByRole("link", { name: "Log in" })
    expect(link).toHaveAttribute("href", "/login")
  })
})
