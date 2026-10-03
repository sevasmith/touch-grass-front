import { fireEvent, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithQueryClient } from "@/test/render-with-query"

import { verifyEmail } from "../api/verify-email.action"
import { VerifyEmailForm } from "./VerifyEmailForm"

vi.mock("../api/verify-email.action", () => ({ verifyEmail: vi.fn() }))
vi.mock("../api/resend-verification.action", () => ({
  resendVerification: vi.fn(),
}))
const router = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => router }))

function codeInput() {
  return screen.getByRole("textbox", { name: "Verification code" })
}

function type(value: string) {
  fireEvent.change(codeInput(), { target: { value } })
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Verify" }))
}

function resendButton() {
  return screen.getByRole("button", { name: /Resend code/ })
}

beforeEach(() => {
  vi.mocked(verifyEmail).mockReset()
})

describe("VerifyEmailForm — input", () => {
  it("is a one-time-code input limited to six characters", () => {
    renderWithQueryClient(<VerifyEmailForm initialCooldownEndsAt={null} />)

    expect(codeInput()).toHaveAttribute("autocomplete", "one-time-code")
    expect(codeInput()).toHaveAttribute("maxlength", "6")
  })

  it("accepts only digits", () => {
    renderWithQueryClient(<VerifyEmailForm initialCooldownEndsAt={null} />)

    type("12a")
    expect(codeInput()).toHaveValue("")

    type("012")
    expect(codeInput()).toHaveValue("012")
  })

  it("does not submit when the 6th digit is typed", async () => {
    renderWithQueryClient(<VerifyEmailForm initialCooldownEndsAt={null} />)

    type("123456")

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(verifyEmail).not.toHaveBeenCalled()
  })

  it("shows an error for an incomplete code and does not call the action", async () => {
    renderWithQueryClient(<VerifyEmailForm initialCooldownEndsAt={null} />)

    type("123")
    submit()

    expect(
      await screen.findByText("Enter the 6-digit code")
    ).toBeInTheDocument()
    expect(verifyEmail).not.toHaveBeenCalled()
  })
})

describe("VerifyEmailForm — submission", () => {
  it("submits once with the code as a string and follows the redirect", async () => {
    vi.mocked(verifyEmail).mockResolvedValue({ ok: true, redirectTo: "/map" })
    renderWithQueryClient(<VerifyEmailForm initialCooldownEndsAt={null} />)

    type("012345")
    submit()

    await waitFor(() => expect(verifyEmail).toHaveBeenCalledTimes(1))
    expect(verifyEmail).toHaveBeenCalledWith({ code: "012345" })
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/map"))
  })

  it("submits on Enter (form submit) as well", async () => {
    vi.mocked(verifyEmail).mockResolvedValue({ ok: true, redirectTo: "/map" })
    renderWithQueryClient(<VerifyEmailForm initialCooldownEndsAt={null} />)

    type("123456")
    fireEvent.submit(codeInput().closest("form")!)

    await waitFor(() => expect(verifyEmail).toHaveBeenCalledTimes(1))
  })

  it("disables the Verify button while pending", async () => {
    vi.mocked(verifyEmail).mockReturnValue(new Promise(() => {}))
    renderWithQueryClient(<VerifyEmailForm initialCooldownEndsAt={null} />)

    type("123456")
    submit()

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Verify/ })).toBeDisabled()
    )
  })

  it("clears the input and explains the used attempt on CODE_INVALID", async () => {
    vi.mocked(verifyEmail).mockResolvedValue({
      ok: false,
      error: "CODE_INVALID",
    })
    renderWithQueryClient(<VerifyEmailForm initialCooldownEndsAt={null} />)

    type("123456")
    submit()

    expect(
      await screen.findByText(
        "Invalid verification code. That used one of your 5 attempts."
      )
    ).toBeInTheDocument()
    expect(codeInput()).toHaveValue("")
    expect(resendButton()).toHaveAttribute("data-emphasised", "false")
  })

  it.each([
    ["CODE_EXPIRED", "Verification code expired. Request a new code below."],
    ["CODE_NONE_ACTIVE", "No valid code. Please request a new one."],
    [
      "CODE_ATTEMPTS_EXHAUSTED",
      "Too many attempts, please request a new verification code",
    ],
  ] as const)(
    "shows %s and emphasises the resend button",
    async (error, copy) => {
      vi.mocked(verifyEmail).mockResolvedValue({ ok: false, error })
      renderWithQueryClient(<VerifyEmailForm initialCooldownEndsAt={null} />)

      expect(resendButton()).toHaveAttribute("data-emphasised", "false")
      type("123456")
      submit()

      expect(await screen.findByText(copy)).toBeInTheDocument()
      expect(resendButton()).toHaveAttribute("data-emphasised", "true")
    }
  )

  it("passes the initial cooldown to the resend button", () => {
    renderWithQueryClient(
      <VerifyEmailForm initialCooldownEndsAt={Date.now() + 30_000} />
    )

    expect(resendButton()).toBeDisabled()
  })
})
