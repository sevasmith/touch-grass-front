"use client"

import { resetPassword } from "./reset-password.action"
import {
  useAuthMutation,
  type AuthMutationCallbacks,
} from "./use-auth-mutation"

export function useResetPassword(
  callbacks?: AuthMutationCallbacks<Awaited<ReturnType<typeof resetPassword>>>
) {
  return useAuthMutation(resetPassword, callbacks)
}
