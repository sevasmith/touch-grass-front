"use client"

import {
  useAuthMutation,
  type AuthMutationCallbacks,
} from "./use-auth-mutation"
import { verifyEmail } from "./verify-email.action"

export function useVerifyEmail(
  callbacks?: AuthMutationCallbacks<Awaited<ReturnType<typeof verifyEmail>>>
) {
  return useAuthMutation(verifyEmail, callbacks)
}
