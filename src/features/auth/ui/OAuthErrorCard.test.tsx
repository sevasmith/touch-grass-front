import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { AUTH_ERROR_COPY } from "../model/auth-error"
import { OAuthErrorCard } from "./OAuthErrorCard"

describe("OAuthErrorCard", () => {
  it.each([
    "OAUTH_ACCESS_DENIED",
    "OAUTH_EMAIL_IN_USE",
    "OAUTH_RATE_LIMITED",
    "OAUTH_FAILED",
    "NETWORK_ERROR",
  ] as const)("shows the %s copy with a retry path", (code) => {
    render(<OAuthErrorCard code={code} />)

    expect(screen.getByRole("alert")).toHaveTextContent(AUTH_ERROR_COPY[code])
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute(
      "href",
      "http://api.test/auth/google"
    )
    expect(
      screen.getByRole("link", { name: "Back to log in" })
    ).toHaveAttribute("href", "/login")
  })
})
