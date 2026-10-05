import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { logout } from "../api/logout.action"
import { LogoutPrompt } from "./LogoutPrompt"

vi.mock("../api/logout.action", () => ({ logout: vi.fn() }))

beforeEach(() => {
  vi.mocked(logout).mockReset()
})

function renderPrompt() {
  render(<LogoutPrompt prompt="Wrong email?" linkLabel="Log out" />)
  return screen.getByRole("button", { name: "Log out" })
}

describe("LogoutPrompt", () => {
  it("renders the prompt with a link-styled submit inside a form", () => {
    const button = renderPrompt()

    expect(button.closest("form")).toHaveTextContent("Wrong email? Log out")
    expect(button).toHaveAttribute("type", "submit")
  })

  it("submits through the logout Server Action and disables while pending", async () => {
    vi.mocked(logout).mockReturnValue(new Promise(() => {}))
    const button = renderPrompt()

    await act(async () => {
      fireEvent.click(button)
    })

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1))
    expect(button).toBeDisabled()
  })
})
