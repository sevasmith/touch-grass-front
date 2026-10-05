import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { cookieJar, resetNextHeaders } from "@/test/next-headers.mock"

import { VerifyEmailPage } from "./VerifyEmailPage"

vi.mock("next/headers", () => import("@/test/next-headers.mock"))
const form = vi.hoisted(() => ({ props: vi.fn() }))
vi.mock("@/features/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/auth")>()),
  VerifyEmailForm: (props: { initialCooldownEndsAt: number | null }) => {
    form.props(props)
    return <div data-testid="verify-form" />
  },
}))

const NOW = 1_790_000_000_000

beforeEach(() => {
  resetNextHeaders()
  form.props.mockReset()
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

async function renderPage() {
  render(await VerifyEmailPage())
}

describe("VerifyEmailPage", () => {
  it("renders the heading and the form", async () => {
    await renderPage()

    expect(
      screen.getByRole("heading", { level: 1, name: "Verify your email" })
    ).toBeInTheDocument()
    expect(screen.getByTestId("verify-form")).toBeInTheDocument()
  })

  it("offers a way off the page by logging out", async () => {
    await renderPage()

    expect(
      screen.getByText("Wrong email, or want to verify later?")
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Log out" })).toHaveAttribute(
      "type",
      "submit"
    )
  })

  it("passes the remaining cooldown when a code was sent 20 s ago", async () => {
    cookieJar.seed({ tg_code_sent_at: String(NOW - 20_000) })

    await renderPage()

    expect(form.props).toHaveBeenCalledWith({
      initialCooldownEndsAt: NOW + 40_000,
    })
  })

  it.each<[string, Record<string, string>]>([
    ["without the cookie", {}],
    ["after 60 s", { tg_code_sent_at: String(NOW - 60_000) }],
    ["for a malformed cookie", { tg_code_sent_at: "soon" }],
  ])("passes null %s", async (_, cookies) => {
    cookieJar.seed(cookies)

    await renderPage()

    expect(form.props).toHaveBeenCalledWith({ initialCooldownEndsAt: null })
  })
})
