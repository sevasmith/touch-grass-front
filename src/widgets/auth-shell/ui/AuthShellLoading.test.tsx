import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { AuthShellLoading } from "./AuthShellLoading"

describe("AuthShellLoading", () => {
  it("renders an accessible spinner inside a fixed-height box", () => {
    render(<AuthShellLoading />)

    const spinner = screen.getByRole("status")
    expect(spinner).toHaveAccessibleName()
    const box = spinner.closest("[data-slot=auth-shell-loading]")
    expect(box?.className).toMatch(/\bh-\[?\d/)
  })
})
