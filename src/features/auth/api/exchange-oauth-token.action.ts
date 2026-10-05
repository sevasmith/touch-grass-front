"use server"

import { cookies } from "next/headers"
import { z } from "zod"

import {
  clearHandoffToken,
  TokenPairSchema,
  writeTokenPair,
} from "@/entities/session"
import { getCurrentUser } from "@/entities/user"
import { backendFetch } from "@/shared/api/backend-fetch"

import { AUTH_ROUTES } from "../config/routes"
import { mapBackendError } from "../lib/map-backend-error"
import type { AuthActionResult } from "../model/auth-error"

const ExchangeInputSchema = z.object({ token: z.string().min(1) })

/**
 * contracts/server-actions.md `exchangeOAuthToken`. The handoff token is single-use, so this is
 * never retried; the caller guards against StrictMode double effects.
 */
export async function exchangeOAuthToken(
  input: unknown
): Promise<AuthActionResult> {
  try {
    const store = await cookies()
    // Single-use: whatever happens next, the page must not offer it again.
    clearHandoffToken(store, "/oauth/complete")

    const parsed = ExchangeInputSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: "OAUTH_FAILED" }

    const result = await backendFetch("/auth/oauth/exchange", {
      method: "POST",
      body: parsed.data,
      schema: TokenPairSchema,
    })
    if (!result.ok)
      return { ok: false, error: mapBackendError("oauth-exchange", result) }

    writeTokenPair(store, result.data)

    const me = await getCurrentUser(result.data.accessToken)
    const verified = !me.ok || me.user.emailVerified
    return {
      ok: true,
      redirectTo: verified ? AUTH_ROUTES.map : AUTH_ROUTES.verifyEmail,
    }
  } catch (error) {
    console.error(
      "[exchangeOAuthToken] unexpected failure",
      error instanceof Error ? error.name : "unknown"
    )
    return { ok: false, error: "UNEXPECTED" }
  }
}
