import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { logout } from "../api/logout.action"
import { LogoutButton } from "./LogoutButton"

vi.mock("../api/logout.action", () => ({ logout: vi.fn() }))

beforeEach(() => {
  vi.mocked(logout).mockReset()
})

describe("LogoutButton", () => {
  it("renders a form with a Log out submit button", () => {
    render(<LogoutButton />)

    const button = screen.getByRole("button", { name: "Log out" })
    expect(button).toHaveAttribute("type", "submit")
    expect(button.closest("form")).toBeInTheDocument()
  })

  it("submits through the logout Server Action", async () => {
    vi.mocked(logout).mockResolvedValue(undefined)
    render(<LogoutButton />)

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Log out" }))
    })

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1))
  })

  it("is disabled while the action is pending", async () => {
    vi.mocked(logout).mockReturnValue(new Promise(() => {}))
    render(<LogoutButton />)

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Log out" }))
    })

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Log out/ })).toBeDisabled()
    )
  })
})
