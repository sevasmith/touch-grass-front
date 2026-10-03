"use server"

import { authedFetch } from "@/entities/session"

import { AUTH_ROUTES } from "../config/routes"
import { toFieldErrors } from "../lib/field-errors"
import { isVerifyCodeError, mapBackendError } from "../lib/map-backend-error"
import type { AuthActionResult } from "../model/auth-error"
import { VerifyEmailSchema } from "../model/verify-email.schema"

/**
 * contracts/server-actions.md `verifyEmail`. A code error is never refreshed and retried, so the
 * backend checks the code at most once per submission (FR-014, FR-016). Success needs no refresh:
 * the access token already held works on every route.
 */
export async function verifyEmail(input: unknown): Promise<AuthActionResult> {
  try {
    const parsed = VerifyEmailSchema.safeParse(input)
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION",
        fieldErrors: toFieldErrors(parsed.error),
      }
    }

    const result = await authedFetch("/auth/verify-email", {
      method: "POST",
      body: parsed.data,
      isSessionFailure: (error) => !isVerifyCodeError(error.message),
    })
    if (!result.ok)
      return { ok: false, error: mapBackendError("verify-email", result) }
    return { ok: true, redirectTo: AUTH_ROUTES.map }
  } catch (error) {
    console.error(
      "[verifyEmail] unexpected failure",
      error instanceof Error ? error.name : "unknown"
    )
    return { ok: false, error: "UNEXPECTED" }
  }
}
