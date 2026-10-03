"use server"

import { cookies } from "next/headers"

import { clearSession } from "@/entities/session"
import { backendFetch } from "@/shared/api/backend-fetch"

import { toFieldErrors } from "../lib/field-errors"
import { mapBackendError } from "../lib/map-backend-error"
import { AUTH_ERROR_COPY, type AuthActionResult } from "../model/auth-error"
import { ResetPasswordSchema } from "../model/reset-password.schema"

/**
 * contracts/server-actions.md `resetPassword`. A successful reset, or a link that was already
 * used, revokes every session on the backend, so this browser's cookies are cleared too.
 */
export async function resetPassword(input: unknown): Promise<AuthActionResult> {
  try {
    const parsed = ResetPasswordSchema.safeParse(input)
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION",
        fieldErrors: toFieldErrors(parsed.error),
      }
    }

    const { token, password } = parsed.data
    const result = await backendFetch("/auth/reset-password", {
      method: "POST",
      body: { token, password },
    })
    if (result.ok) {
      clearSession(await cookies())
      return { ok: true }
    }

    const error = mapBackendError("reset-password", result)
    if (error === "RESET_ALREADY_USED") clearSession(await cookies())
    if (error === "RESET_SAME_PASSWORD") {
      return {
        ok: false,
        error,
        fieldErrors: { password: AUTH_ERROR_COPY.RESET_SAME_PASSWORD },
      }
    }
    return { ok: false, error }
  } catch (error) {
    console.error(
      "[resetPassword] unexpected failure",
      error instanceof Error ? error.name : "unknown"
    )
    return { ok: false, error: "UNEXPECTED" }
  }
}
