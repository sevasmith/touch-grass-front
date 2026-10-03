import { act, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithQueryClient } from "@/test/render-with-query"

import { resendVerification } from "../api/resend-verification.action"
import { ResendCodeButton } from "./ResendCodeButton"

vi.mock("../api/resend-verification.action", () => ({
  resendVerification: vi.fn(),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }))

const NOW = 1_790_000_000_000

beforeEach(() => {
  // Only the countdown is faked; React Query and waitFor keep real setTimeout.
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] })
  vi.setSystemTime(NOW)
  vi.mocked(resendVerification).mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

function tick(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

describe("ResendCodeButton", () => {
  it("counts down from an initial cooldown and then enables itself", () => {
    renderWithQueryClient(
      <ResendCodeButton initialCooldownEndsAt={NOW + 60_000} />
    )

    expect(
      screen.getByRole("button", { name: "Resend code in 60s" })
    ).toBeDisabled()

    tick(1_000)
    expect(
      screen.getByRole("button", { name: "Resend code in 59s" })
    ).toBeDisabled()

    tick(59_000)
    expect(screen.getByRole("button", { name: "Resend code" })).toBeEnabled()
  })

  it("is enabled without a cooldown", () => {
    renderWithQueryClient(<ResendCodeButton initialCooldownEndsAt={null} />)

    expect(screen.getByRole("button", { name: "Resend code" })).toBeEnabled()
  })

  it("announces success and re-enters the 60 s cooldown", async () => {
    vi.mocked(resendVerification).mockResolvedValue({
      ok: true,
      cooldownEndsAt: NOW + 60_000,
    })
    renderWithQueryClient(<ResendCodeButton initialCooldownEndsAt={null} />)

    fireEvent.click(screen.getByRole("button", { name: "Resend code" }))

    expect(await screen.findByText(/New code sent/)).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Resend code in 60s" })
    ).toBeDisabled()
    expect(resendVerification).toHaveBeenCalledTimes(1)
  })

  it.each([
    ["RESEND_COOLDOWN", "Please wait a moment before requesting another code"],
    [
      "EMAIL_SEND_FAILED",
      "Unable to send the verification email, try again later",
    ],
    ["RATE_LIMITED", "Too many requests, please try again later"],
  ] as const)(
    "shows %s and enters the cooldown it returns",
    async (error, copy) => {
      vi.mocked(resendVerification).mockResolvedValue({
        ok: false,
        error,
        cooldownEndsAt: NOW + 45_000,
      })
      renderWithQueryClient(<ResendCodeButton initialCooldownEndsAt={null} />)

      fireEvent.click(screen.getByRole("button", { name: "Resend code" }))

      expect(await screen.findByText(copy)).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: "Resend code in 45s" })
      ).toBeDisabled()
    }
  )

  it("stays enabled after a failure without a cooldown", async () => {
    vi.mocked(resendVerification).mockResolvedValue({
      ok: false,
      error: "NETWORK_ERROR",
    })
    renderWithQueryClient(<ResendCodeButton initialCooldownEndsAt={null} />)

    fireEvent.click(screen.getByRole("button", { name: "Resend code" }))

    expect(
      await screen.findByText(
        "We couldn't reach Touch Grass. Check your connection and try again."
      )
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Resend code" })).toBeEnabled()
    )
  })

  it("announces status changes politely", () => {
    renderWithQueryClient(<ResendCodeButton initialCooldownEndsAt={null} />)

    expect(document.querySelector("[aria-live=polite]")).toBeInTheDocument()
  })

  it("switches to the emphasised style when asked", () => {
    const { rerender } = renderWithQueryClient(
      <ResendCodeButton initialCooldownEndsAt={null} />
    )
    expect(screen.getByRole("button", { name: "Resend code" })).toHaveAttribute(
      "data-emphasised",
      "false"
    )

    rerender(<ResendCodeButton initialCooldownEndsAt={null} emphasised />)
    expect(screen.getByRole("button", { name: "Resend code" })).toHaveAttribute(
      "data-emphasised",
      "true"
    )
  })
})
