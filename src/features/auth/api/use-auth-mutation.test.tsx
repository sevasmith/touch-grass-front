import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useAuthMutation } from "./use-auth-mutation"

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => router }))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: 0 } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {})
})

async function run<T>(action: (input: T) => Promise<unknown>, input: T) {
  const onFailure = vi.fn()
  const onSuccess = vi.fn()
  const { result } = renderHook(
    () =>
      useAuthMutation(action as never, {
        onFailure,
        onSuccess,
      }),
    { wrapper }
  )
  await act(async () => {
    result.current.mutate(input as never)
  })
  await waitFor(() => expect(result.current.isPending).toBe(false))
  return { onFailure, onSuccess, result }
}

describe("useAuthMutation", () => {
  it("replaces the route with redirectTo on success", async () => {
    const action = vi.fn(async () => ({
      ok: true as const,
      redirectTo: "/map" as const,
    }))

    const { onSuccess, onFailure } = await run(action, { email: "a" })

    expect(router.replace).toHaveBeenCalledWith("/map")
    expect(onSuccess).toHaveBeenCalledWith({ ok: true, redirectTo: "/map" })
    expect(onFailure).not.toHaveBeenCalled()
  })

  it("does not navigate on a success without redirectTo", async () => {
    const action = vi.fn(async () => ({ ok: true as const, cooldownEndsAt: 5 }))

    const { onSuccess } = await run(action, undefined)

    expect(router.replace).not.toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalledWith({ ok: true, cooldownEndsAt: 5 })
  })

  it("sends SESSION_EXPIRED to /login?reason=session_expired", async () => {
    const action = vi.fn(async () => ({
      ok: false as const,
      error: "SESSION_EXPIRED" as const,
    }))

    const { onFailure } = await run(action, {})

    expect(router.replace).toHaveBeenCalledWith("/login?reason=session_expired")
    expect(onFailure).not.toHaveBeenCalled()
  })

  it("sends EMAIL_NOT_VERIFIED to /verify-email (global 403 handler, FR-020)", async () => {
    const action = vi.fn(async () => ({
      ok: false as const,
      error: "EMAIL_NOT_VERIFIED" as const,
    }))

    const { onFailure } = await run(action, {})

    expect(router.replace).toHaveBeenCalledWith("/verify-email")
    expect(onFailure).not.toHaveBeenCalled()
  })

  it("hands any other failure to onFailure without navigating", async () => {
    const failure = {
      ok: false as const,
      error: "INVALID_CREDENTIALS" as const,
      fieldErrors: { email: "x" },
    }
    const action = vi.fn(async () => failure)

    const { onFailure } = await run(action, {})

    expect(onFailure).toHaveBeenCalledWith(failure)
    expect(router.replace).not.toHaveBeenCalled()
  })

  it("logs a rejected action and reports NETWORK_ERROR without navigating", async () => {
    const action = vi.fn(async () => {
      throw new Error("Failed to find Server Action")
    })

    const { onFailure, result } = await run(action, {})

    expect(console.error).toHaveBeenCalled()
    expect(onFailure).toHaveBeenCalledWith({
      ok: false,
      error: "NETWORK_ERROR",
    })
    expect(router.replace).not.toHaveBeenCalled()
    expect(result.current.isPending).toBe(false)
  })

  it("calls the action exactly once per mutate (no retry)", async () => {
    const action = vi.fn(async () => {
      throw new Error("offline")
    })

    await run(action, { email: "a" })

    expect(action).toHaveBeenCalledTimes(1)
    expect(action).toHaveBeenCalledWith({ email: "a" })
  })
})
