import { useQueryClient, type QueryClient } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Providers } from "./index"

describe("Providers", () => {
  it("renders its children", () => {
    render(
      <Providers>
        <p>child</p>
      </Providers>
    )

    expect(screen.getByText("child")).toBeInTheDocument()
  })

  it("provides one QueryClient with mutation retries off, stable across re-renders", () => {
    const seen: QueryClient[] = []
    function Probe() {
      seen.push(useQueryClient())
      return null
    }

    const { rerender } = render(
      <Providers>
        <Probe />
      </Providers>
    )
    rerender(
      <Providers>
        <Probe />
      </Providers>
    )

    expect(seen.length).toBeGreaterThanOrEqual(2)
    expect(new Set(seen).size).toBe(1)
    expect(seen[0].getDefaultOptions().mutations?.retry).toBe(0)
  })
})
