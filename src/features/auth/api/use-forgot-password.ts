"use client"

import { forgotPassword } from "./forgot-password.action"
import {
  useAuthMutation,
  type AuthMutationCallbacks,
} from "./use-auth-mutation"

export function useForgotPassword(
  callbacks?: AuthMutationCallbacks<Awaited<ReturnType<typeof forgotPassword>>>
) {
  return useAuthMutation(forgotPassword, callbacks)
}
