import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { cookieJar, resetNextHeaders } from "@/test/next-headers.mock"

import { ResetPasswordPage } from "./ResetPasswordPage"

vi.mock("next/headers", () => import("@/test/next-headers.mock"))
const form = vi.hoisted(() => ({ props: vi.fn() }))
vi.mock("@/features/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/auth")>()),
  ResetPasswordForm: (props: { initialToken?: string }) => {
    form.props(props)
    return <div data-testid="reset-form" />
  },
}))

beforeEach(() => {
  resetNextHeaders()
  form.props.mockReset()
})

describe("ResetPasswordPage", () => {
  it("renders the heading and passes the handoff cookie's token to the form", async () => {
    cookieJar.seed({ tg_reset_token: "t0k3n" })

    render(await ResetPasswordPage())

    expect(
      screen.getByRole("heading", { level: 1, name: "Set a new password" })
    ).toBeInTheDocument()
    expect(form.props).toHaveBeenLastCalledWith({ initialToken: "t0k3n" })
  })

  it.each<[string, Record<string, string>]>([
    ["no cookie", {}],
    ["an empty cookie", { tg_reset_token: "" }],
  ])("passes no token for %s", async (_, cookies) => {
    cookieJar.seed(cookies)

    render(await ResetPasswordPage())

    expect(form.props).toHaveBeenLastCalledWith({ initialToken: undefined })
  })
})
