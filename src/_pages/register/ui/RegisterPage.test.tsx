import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { RegisterPage } from "./RegisterPage"

vi.mock("@/features/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/auth")>()),
  RegisterForm: () => <div data-testid="register-form" />,
}))

describe("RegisterPage", () => {
  it("renders the heading, subtitle and the registration form", () => {
    render(<RegisterPage />)

    expect(
      screen.getByRole("heading", { level: 1, name: "Join Touch Grass" })
    ).toBeInTheDocument()
    expect(
      screen.getByText("Create an account to start your journey.")
    ).toBeInTheDocument()
    expect(screen.getByTestId("register-form")).toBeInTheDocument()
  })
})

describe("Google sign-in (US4)", () => {
  it('renders the "or" divider and a Continue with Google link below the form', async () => {
    render(<RegisterPage />)

    const form = screen.getByTestId("register-form")
    const google = screen.getByRole("link", { name: "Continue with Google" })
    expect(google).toHaveAttribute("href", "http://api.test/auth/google")
    expect(screen.getByText("or")).toBeInTheDocument()
    expect(
      form.compareDocumentPosition(google) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })
})

describe("switching between login and signup (US5)", () => {
  it('links "Log in" to /login below the Google button', async () => {
    render(<RegisterPage />)

    const link = screen.getByRole("link", { name: "Log in" })
    expect(link).toHaveAttribute("href", "/login")
    expect(link.parentElement).toHaveTextContent(
      "Already have an account? Log in"
    )
    const google = screen.getByRole("link", { name: "Continue with Google" })
    expect(
      google.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })
})
