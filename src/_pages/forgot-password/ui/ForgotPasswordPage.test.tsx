import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ForgotPasswordPage } from "./ForgotPasswordPage"

vi.mock("@/features/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/auth")>()),
  ForgotPasswordForm: () => <div data-testid="forgot-form" />,
}))

describe("ForgotPasswordPage", () => {
  it("renders the heading and the form", () => {
    render(<ForgotPasswordPage />)

    expect(
      screen.getByRole("heading", { level: 1, name: "Reset your password" })
    ).toBeInTheDocument()
    expect(screen.getByTestId("forgot-form")).toBeInTheDocument()
  })
})
