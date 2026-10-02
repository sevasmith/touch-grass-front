"use client"

import { register } from "./register.action"
import {
  useAuthMutation,
  type AuthMutationCallbacks,
} from "./use-auth-mutation"

export function useRegister(
  callbacks?: AuthMutationCallbacks<Awaited<ReturnType<typeof register>>>
) {
  return useAuthMutation(register, callbacks)
}
