import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { SocialPlaceholder } from "./social-placeholder"

describe("SocialPlaceholder", () => {
  it("renders three disabled provider buttons", () => {
    render(<SocialPlaceholder />)

    for (const provider of ["Google", "GitHub", "Discord"]) {
      const button = screen.getByRole("button", {
        name: new RegExp(provider, "i"),
      })
      expect(button).toBeInTheDocument()
      expect(button).toBeDisabled()
    }
  })

  it("shows a Coming soon hint on every button", () => {
    render(<SocialPlaceholder />)

    const buttons = screen.getAllByRole("button", { name: /coming soon/i })
    expect(buttons).toHaveLength(3)
  })

  it("renders the 'or continue with' heading", () => {
    render(<SocialPlaceholder />)

    expect(screen.getByText(/or continue with/i)).toBeInTheDocument()
  })
})
