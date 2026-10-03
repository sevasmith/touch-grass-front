"use client"

import { resendVerification } from "./resend-verification.action"
import {
  useAuthMutation,
  type AuthMutationCallbacks,
} from "./use-auth-mutation"

export function useResendVerification(
  callbacks?: AuthMutationCallbacks<
    Awaited<ReturnType<typeof resendVerification>>
  >
) {
  return useAuthMutation(resendVerification, callbacks)
}
