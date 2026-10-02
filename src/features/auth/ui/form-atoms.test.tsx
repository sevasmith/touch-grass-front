import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { AUTH_ERROR_COPY } from "../model/auth-error"
import { EmailField } from "./EmailField"
import { FormErrorAlert } from "./FormErrorAlert"
import { PasswordField } from "./PasswordField"

describe("FormErrorAlert", () => {
  it("renders the copy for the code in role=alert", () => {
    render(<FormErrorAlert code="INVALID_CREDENTIALS" />)

    expect(screen.getByRole("alert")).toHaveTextContent(
      AUTH_ERROR_COPY.INVALID_CREDENTIALS
    )
  })

  it.each([undefined, null])("renders nothing without a code (%s)", (code) => {
    const { container } = render(<FormErrorAlert code={code} />)

    expect(container).toBeEmptyDOMElement()
  })
})

describe.each([
  ["EmailField", EmailField, "Email", "email"],
  ["PasswordField", PasswordField, "Password", "current-password"],
] as const)("%s", (_, Field, label, autoComplete) => {
  it("has a visible label tied to the input", () => {
    render(<Field autoComplete={autoComplete} />)

    const input = screen.getByLabelText(label)
    expect(input.tagName).toBe("INPUT")
    expect(screen.getByText(label)).toBeVisible()
  })

  it("forwards autoComplete", () => {
    render(<Field autoComplete={autoComplete} />)

    expect(screen.getByLabelText(label)).toHaveAttribute(
      "autocomplete",
      autoComplete
    )
  })

  it("is valid and undescribed without an error", () => {
    render(<Field autoComplete={autoComplete} />)

    const input = screen.getByLabelText(label)
    expect(input).not.toHaveAttribute("aria-invalid", "true")
    expect(input).not.toHaveAttribute("aria-describedby")
  })

  it("sets aria-invalid and aria-describedby to the error text", () => {
    render(<Field autoComplete={autoComplete} error="Something is wrong" />)

    const input = screen.getByLabelText(label)
    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(input).toHaveAccessibleDescription("Something is wrong")
  })
})

describe("EmailField", () => {
  it("is an email input", () => {
    render(<EmailField />)

    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email")
  })
})

describe("PasswordField", () => {
  it("is a password input with a custom label and supports new-password", () => {
    render(
      <PasswordField label="Confirm password" autoComplete="new-password" />
    )

    const input = screen.getByLabelText("Confirm password")
    expect(input).toHaveAttribute("type", "password")
    expect(input).toHaveAttribute("autocomplete", "new-password")
  })

  it("renders content beside the label", () => {
    render(
      <PasswordField
        autoComplete="current-password"
        labelAside={<a href="/x">Forgot?</a>}
      />
    )

    expect(screen.getByRole("link", { name: "Forgot?" })).toBeInTheDocument()
  })
})
