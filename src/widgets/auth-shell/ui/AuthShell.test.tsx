import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { AuthShell } from "./AuthShell"

function renderShell() {
  return render(
    <AuthShell>
      <p>form content</p>
    </AuthShell>
  )
}

describe("AuthShell", () => {
  it("renders its children in the form column", () => {
    renderShell()

    expect(screen.getByText("form content").closest("main")).toBeInTheDocument()
  })

  it("renders the hero image as decoration in a panel hidden below lg", () => {
    const { container } = renderShell()

    const hero = container.querySelector('img[src*="auth-hero"]')
    expect(hero).toHaveAttribute("alt", "")
    const panel = hero?.closest("[data-slot=auth-hero]")
    expect(panel).toHaveClass("hidden", "lg:block")
  })

  it("shows the Touch Grass hero title", () => {
    renderShell()

    expect(screen.getByText("Touch Grass")).toBeInTheDocument()
  })

  it("renders the help icon as decoration", () => {
    const { container } = renderShell()

    const help = container.querySelector('img[src*="help.svg"]')
    expect(help).toHaveAttribute("alt", "")
    expect(help).toHaveAttribute("aria-hidden", "true")
  })

  it("renders the footer text without links", () => {
    renderShell()

    expect(
      screen.getByText(/© 2024 Touch Grass\. All rights reserved\./)
    ).toBeInTheDocument()
    for (const label of ["Privacy Policy", "Terms of Service", "Contact"]) {
      expect(screen.getByText(label).closest("a")).toBeNull()
    }
    expect(screen.queryAllByRole("link")).toHaveLength(0)
  })
})
