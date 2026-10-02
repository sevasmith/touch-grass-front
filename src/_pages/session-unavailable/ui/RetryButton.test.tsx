import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { RetryButton } from "./RetryButton"

const originalLocation = window.location

afterEach(() => {
  Object.defineProperty(window, "location", {
    value: originalLocation,
    configurable: true,
  })
})

describe("RetryButton", () => {
  it("reloads the page once per click", () => {
    const reload = vi.fn()
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, reload },
      configurable: true,
    })
    render(<RetryButton />)

    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(reload).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(reload).toHaveBeenCalledTimes(2)
  })
})
