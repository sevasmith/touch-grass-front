import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { MapPage } from "./MapPage"

describe("MapPage", () => {
  it('renders the "Map coming soon" heading without calling the backend', () => {
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)

    render(<MapPage />)

    expect(
      screen.getByRole("heading", { name: "Map coming soon" })
    ).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })
})
