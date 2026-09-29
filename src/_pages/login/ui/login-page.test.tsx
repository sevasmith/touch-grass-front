import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { LoginPage } from "./login-page"

vi.mock("next/headers", () => ({ cookies: vi.fn() }))

describe("LoginPage", () => {
  it("renders the welcome heading", () => {
    render(<LoginPage />)

    expect(
      screen.getByRole("heading", { name: "Welcome back" })
    ).toBeInTheDocument()
  })

  it("composes the email input and log in button", () => {
    render(<LoginPage />)

    expect(screen.getByLabelText("Email")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument()
  })

  it("links to the register page", () => {
    render(<LoginPage />)

    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute(
      "href",
      "/register"
    )
  })

  it("links to the forgot password page", () => {
    render(<LoginPage />)

    expect(
      screen.getByRole("link", { name: "Forgot password?" })
    ).toHaveAttribute("href", "/forgot-password")
  })

  it("renders the legal footer links", () => {
    render(<LoginPage />)

    expect(
      screen.getByRole("link", { name: "Privacy Policy" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Terms of Service" })
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Contact" })).toBeInTheDocument()
  })
})
