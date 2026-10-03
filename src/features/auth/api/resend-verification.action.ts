"use server"

import { cookies } from "next/headers"

import { authedFetch, writeCodeSentAt } from "@/entities/session"

import { RESEND_COOLDOWN_MS } from "../config/verification"
import { mapBackendError } from "../lib/map-backend-error"
import type { AuthErrorCode } from "../model/auth-error"

export type ResendVerificationResult =
  | { ok: true; cooldownEndsAt: number }
  | { ok: false; error: AuthErrorCode; cooldownEndsAt?: number }

/** Failures after which the backend's 60 s cooldown still applies (a 503 still created a code). */
const COOLDOWN_FAILURES = new Set([429, 503])

/** contracts/server-actions.md `resendVerification`. */
export async function resendVerification(): Promise<ResendVerificationResult> {
  try {
    const result = await authedFetch("/auth/resend-verification", {
      method: "POST",
    })
    const startsCooldown =
      result.ok ||
      (result.kind === "http" && COOLDOWN_FAILURES.has(result.status))
    if (!result.ok && !startsCooldown) {
      return {
        ok: false,
        error: mapBackendError("resend-verification", result),
      }
    }

    const now = Date.now()
    writeCodeSentAt(await cookies(), now)
    const cooldownEndsAt = now + RESEND_COOLDOWN_MS
    return result.ok
      ? { ok: true, cooldownEndsAt }
      : {
          ok: false,
          error: mapBackendError("resend-verification", result),
          cooldownEndsAt,
        }
  } catch (error) {
    console.error(
      "[resendVerification] unexpected failure",
      error instanceof Error ? error.name : "unknown"
    )
    return { ok: false, error: "UNEXPECTED" }
  }
}
