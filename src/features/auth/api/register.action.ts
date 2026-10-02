"use server"

import { cookies } from "next/headers"

import {
  TokenPairSchema,
  writeCodeSentAt,
  writeTokenPair,
} from "@/entities/session"
import { backendFetch } from "@/shared/api/backend-fetch"

import { AUTH_ROUTES } from "../config/routes"
import { toFieldErrors } from "../lib/field-errors"
import { mapBackendError } from "../lib/map-backend-error"
import { AUTH_ERROR_COPY, type AuthActionResult } from "../model/auth-error"
import { RegisterSchema } from "../model/register.schema"

/** contracts/server-actions.md `register`. Signup emails a code, so the resend cooldown starts now. */
export async function register(input: unknown): Promise<AuthActionResult> {
  try {
    const parsed = RegisterSchema.safeParse(input)
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION",
        fieldErrors: toFieldErrors(parsed.error),
      }
    }

    const { email, password } = parsed.data
    const result = await backendFetch("/auth/signup", {
      method: "POST",
      body: { email, password },
      schema: TokenPairSchema,
    })
    if (!result.ok) {
      const error = mapBackendError("signup", result)
      return error === "EMAIL_TAKEN"
        ? {
            ok: false,
            error,
            fieldErrors: { email: AUTH_ERROR_COPY.EMAIL_TAKEN },
          }
        : { ok: false, error }
    }

    const store = await cookies()
    writeTokenPair(store, result.data)
    writeCodeSentAt(store, Date.now())
    return { ok: true, redirectTo: AUTH_ROUTES.verifyEmail }
  } catch (error) {
    console.error(
      "[register] unexpected failure",
      error instanceof Error ? error.name : "unknown"
    )
    return { ok: false, error: "UNEXPECTED" }
  }
}
