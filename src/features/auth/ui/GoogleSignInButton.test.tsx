import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { AuthDivider } from "./AuthDivider"
import { GoogleSignInButton } from "./GoogleSignInButton"

describe("GoogleSignInButton", () => {
  it("is a full-width link to the backend's Google start URL (top-level navigation)", () => {
    render(<GoogleSignInButton />)

    const link = screen.getByRole("link", { name: "Continue with Google" })
    expect(link.tagName).toBe("A")
    expect(link).toHaveAttribute("href", "http://api.test/auth/google")
    expect(link).toHaveClass("w-full")
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("shows the Google logo as decoration", () => {
    const { container } = render(<GoogleSignInButton />)

    const logo = container.querySelector('img[src*="google"]')
    expect(logo).toHaveAttribute("alt", "")
  })

  it("offers no GitHub or Discord sign-in (FR-026)", () => {
    const { container } = render(<GoogleSignInButton />)

    expect(container.textContent).not.toMatch(/github|discord/i)
  })
})

describe("AuthDivider", () => {
  it('renders "or" between two separators', () => {
    render(<AuthDivider />)

    expect(screen.getByText("or")).toBeInTheDocument()
    expect(screen.getAllByRole("separator", { hidden: true })).toHaveLength(2)
  })
})
