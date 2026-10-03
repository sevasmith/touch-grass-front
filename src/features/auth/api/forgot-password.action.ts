"use server"

import { backendFetch } from "@/shared/api/backend-fetch"

import { toFieldErrors } from "../lib/field-errors"
import { mapBackendError } from "../lib/map-backend-error"
import type { AuthActionResult } from "../model/auth-error"
import {
  ForgotPasswordResponseSchema,
  ForgotPasswordSchema,
} from "../model/forgot-password.schema"

/** contracts/server-actions.md `forgotPassword`. Never forwards the backend's message. */
export async function forgotPassword(
  input: unknown
): Promise<AuthActionResult> {
  try {
    const parsed = ForgotPasswordSchema.safeParse(input)
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION",
        fieldErrors: toFieldErrors(parsed.error),
      }
    }

    const result = await backendFetch("/auth/forgot-password", {
      method: "POST",
      body: parsed.data,
      schema: ForgotPasswordResponseSchema,
    })
    if (!result.ok)
      return { ok: false, error: mapBackendError("forgot-password", result) }
    return { ok: true }
  } catch (error) {
    console.error(
      "[forgotPassword] unexpected failure",
      error instanceof Error ? error.name : "unknown"
    )
    return { ok: false, error: "UNEXPECTED" }
  }
}
