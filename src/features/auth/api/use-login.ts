"use client"

import { login } from "./login.action"
import {
  useAuthMutation,
  type AuthMutationCallbacks,
} from "./use-auth-mutation"

export function useLogin(
  callbacks?: AuthMutationCallbacks<Awaited<ReturnType<typeof login>>>
) {
  return useAuthMutation(login, callbacks)
}
