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
