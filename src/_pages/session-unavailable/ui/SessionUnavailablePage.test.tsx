import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { AUTH_ERROR_COPY } from "@/features/auth"

import { SessionUnavailablePage } from "./SessionUnavailablePage"

describe("SessionUnavailablePage", () => {
  it("renders a heading, the NETWORK_ERROR copy and a Retry button", () => {
    render(<SessionUnavailablePage />)

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument()
    expect(screen.getByText(AUTH_ERROR_COPY.NETWORK_ERROR)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument()
  })
})
