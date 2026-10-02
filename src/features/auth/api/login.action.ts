"use server"

import { cookies } from "next/headers"

import { TokenPairSchema, writeTokenPair } from "@/entities/session"
import { getCurrentUser } from "@/entities/user"
import { backendFetch } from "@/shared/api/backend-fetch"

import { AUTH_ROUTES } from "../config/routes"
import { toFieldErrors } from "../lib/field-errors"
import { mapBackendError } from "../lib/map-backend-error"
import type { AuthActionResult } from "../model/auth-error"
import { LoginSchema } from "../model/login.schema"

/** contracts/server-actions.md `login`. Never returns tokens. */
export async function login(input: unknown): Promise<AuthActionResult> {
  try {
    const parsed = LoginSchema.safeParse(input)
    if (!parsed.success) {
      return {
        ok: false,
        error: "VALIDATION",
        fieldErrors: toFieldErrors(parsed.error),
      }
    }

    const result = await backendFetch("/auth/login", {
      method: "POST",
      body: parsed.data,
      schema: TokenPairSchema,
    })
    if (!result.ok)
      return { ok: false, error: mapBackendError("login", result) }

    writeTokenPair(await cookies(), result.data)

    // If /auth/me fails, /map is still safe: the proxy re-checks the tier on navigation.
    const me = await getCurrentUser(result.data.accessToken)
    const verified = !me.ok || me.user.emailVerified
    return {
      ok: true,
      redirectTo: verified ? AUTH_ROUTES.map : AUTH_ROUTES.verifyEmail,
    }
  } catch (error) {
    console.error(
      "[login] unexpected failure",
      error instanceof Error ? error.name : "unknown"
    )
    return { ok: false, error: "UNEXPECTED" }
  }
}
