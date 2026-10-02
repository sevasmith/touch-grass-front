import "server-only"

import { cookies } from "next/headers"

import type { ApiError } from "@/shared/api/api-error.schema"
import {
  backendFetch,
  type BackendFetchOptions,
  type BackendResult,
} from "@/shared/api/backend-fetch"

import { refreshSession } from "../lib/refresh-coordinator"
import {
  clearSession,
  readSession,
  writeTokenPair,
} from "../lib/session-cookies"

const EMAIL_NOT_VERIFIED = "Email not verified"

export type AuthedResult<T> =
  | BackendResult<T>
  | { ok: false; kind: "session_expired" | "email_not_verified" }

export interface AuthedFetchOptions<T> extends Omit<
  BackendFetchOptions<T>,
  "accessToken"
> {
  /**
   * Whether a 401 means the session failed (refresh and retry) rather than a business outcome
   * such as a wrong verification code (returned as is). Defaults to always true.
   */
  isSessionFailure?: (error: ApiError) => boolean
}

/**
 * Backend call with the session's access token, for Server Actions (research R4): on a session
 * 401 it refreshes once through the coordinator and retries once; a 403 "Email not verified"
 * becomes `email_not_verified` (FR-020).
 */
export async function authedFetch<T = undefined>(
  path: `/${string}`,
  { isSessionFailure = () => true, ...options }: AuthedFetchOptions<T>
): Promise<AuthedResult<T>> {
  const store = await cookies()
  const session = readSession(store)
  if (!session) return { ok: false, kind: "session_expired" }

  const isSession401 = (result: BackendResult<T>) =>
    !result.ok &&
    result.kind === "http" &&
    result.status === 401 &&
    isSessionFailure(result.error)

  const first = await backendFetch(path, {
    ...options,
    accessToken: session.accessToken,
  })
  if (!isSession401(first)) return classify(first)

  const refreshed = await refreshSession(session.refreshToken)
  if (refreshed.kind === "transient") return { ok: false, kind: "network" }
  if (refreshed.kind === "revoked") {
    clearSession(store)
    return { ok: false, kind: "session_expired" }
  }

  writeTokenPair(store, refreshed.pair)
  const retry = await backendFetch(path, {
    ...options,
    accessToken: refreshed.pair.accessToken,
  })
  if (isSession401(retry)) {
    clearSession(store)
    return { ok: false, kind: "session_expired" }
  }
  return classify(retry)
}

function classify<T>(result: BackendResult<T>): AuthedResult<T> {
  if (
    !result.ok &&
    result.kind === "http" &&
    result.status === 403 &&
    result.error.message === EMAIL_NOT_VERIFIED
  ) {
    return { ok: false, kind: "email_not_verified" }
  }
  return result
}
