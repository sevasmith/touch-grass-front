"use client"

import type { Route } from "next"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"

import { AUTH_ROUTES } from "../config/routes"
import type { AuthErrorCode } from "../model/auth-error"

type AuthResultLike =
  { ok: true; redirectTo?: Route } | { ok: false; error: AuthErrorCode }

const NETWORK_FAILURE = { ok: false, error: "NETWORK_ERROR" } as const

export type AuthFailure<TResult> =
  Extract<TResult, { ok: false }> | typeof NETWORK_FAILURE

interface AuthMutationCallbacks<TResult> {
  onSuccess?: (result: Extract<TResult, { ok: true }>) => void
  onFailure?: (failure: AuthFailure<TResult>) => void
}

/**
 * Wraps a Server Action in `useMutation` (research R8): follows `redirectTo`, sends
 * SESSION_EXPIRED to /login and EMAIL_NOT_VERIFIED to /verify-email, and hands every other
 * failure to the form. A rejected call (offline, deployment skew) is logged and reported as
 * NETWORK_ERROR, never retried.
 */
export function useAuthMutation<TInput, TResult extends AuthResultLike>(
  action: (input: TInput) => Promise<TResult>,
  { onSuccess, onFailure }: AuthMutationCallbacks<TResult> = {}
) {
  const router = useRouter()

  return useMutation({
    mutationFn: async (
      input: TInput
    ): Promise<TResult | typeof NETWORK_FAILURE> => {
      try {
        return await action(input)
      } catch (error) {
        console.error("[auth] action call failed", error)
        return NETWORK_FAILURE
      }
    },
    retry: 0,
    onSuccess: (result) => {
      if (result.ok) {
        const success = result as Extract<TResult, { ok: true }>
        if (success.redirectTo) router.replace(success.redirectTo)
        onSuccess?.(success)
        return
      }
      if (result.error === "SESSION_EXPIRED")
        return router.replace(AUTH_ROUTES.sessionExpired)
      if (result.error === "EMAIL_NOT_VERIFIED")
        return router.replace(AUTH_ROUTES.verifyEmail)
      onFailure?.(result as AuthFailure<TResult>)
    },
  })
}
