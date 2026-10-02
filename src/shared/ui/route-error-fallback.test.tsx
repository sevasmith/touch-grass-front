import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { RouteErrorFallback } from "./route-error-fallback"

describe("RouteErrorFallback", () => {
  it("shows a generic message in role=alert", () => {
    render(<RouteErrorFallback reset={() => {}} />)

    expect(screen.getByRole("alert")).toHaveTextContent(/something went wrong/i)
  })

  it("calls reset when Retry is clicked", () => {
    const reset = vi.fn()
    render(<RouteErrorFallback reset={reset} />)

    fireEvent.click(screen.getByRole("button", { name: "Retry" }))

    expect(reset).toHaveBeenCalledTimes(1)
  })
})
