import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PasswordField } from "./password-field"

describe("PasswordField", () => {
  it("renders an input of type password by default", () => {
    render(<PasswordField id="password" label="Password" />)

    const input = screen.getByLabelText("Password")
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute("type", "password")
  })

  it("switches the input type when the toggle is clicked", () => {
    render(<PasswordField id="password" label="Password" />)

    const input = screen.getByLabelText("Password")

    fireEvent.click(screen.getByRole("button", { name: "Show password" }))
    expect(input).toHaveAttribute("type", "text")

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }))
    expect(input).toHaveAttribute("type", "password")
  })

  it("updates the toggle aria-label as visibility changes", () => {
    render(<PasswordField id="password" label="Password" />)

    expect(
      screen.getByRole("button", { name: "Show password" })
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Show password" }))
    expect(
      screen.getByRole("button", { name: "Hide password" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Show password" })
    ).not.toBeInTheDocument()
  })

  it("renders the toggle as a button with type=button", () => {
    render(<PasswordField id="password" label="Password" />)

    const toggle = screen.getByRole("button", { name: "Show password" })
    expect(toggle.tagName).toBe("BUTTON")
    expect(toggle).toHaveAttribute("type", "button")
  })
})
