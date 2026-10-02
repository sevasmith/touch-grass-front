import "server-only"

import { serverEnv } from "@/shared/config/env.server"

import {
  CODE_SENT_AT_MAX_AGE,
  SESSION_COOKIES,
  sessionCookieOptions,
} from "../config/cookies"
import type { TokenPair } from "../model/token-pair.schema"

type CookieOptions = ReturnType<typeof sessionCookieOptions>

/**
 * The subset of the cookie API shared by `await cookies()` and `NextResponse.cookies`, so the same
 * helpers work in Server Actions and in the proxy. `NextRequest.cookies.set` takes no options, so
 * the proxy wraps it in an adapter that drops them.
 */
export interface CookieStore {
  get(name: string): { value: string } | undefined
  set(name: string, value: string, options?: CookieOptions): unknown
  delete(name: string): unknown
}

export function readSession(store: CookieStore): TokenPair | null {
  const accessToken = store.get(SESSION_COOKIES.access)?.value
  const refreshToken = store.get(SESSION_COOKIES.refresh)?.value
  if (!accessToken || !refreshToken) return null
  return { accessToken, refreshToken }
}

export function writeTokenPair(store: CookieStore, pair: TokenPair): void {
  const options = sessionCookieOptions(serverEnv.SESSION_COOKIE_MAX_AGE)
  store.set(SESSION_COOKIES.access, pair.accessToken, options)
  store.set(SESSION_COOKIES.refresh, pair.refreshToken, options)
}

export function clearSession(store: CookieStore): void {
  store.delete(SESSION_COOKIES.access)
  store.delete(SESSION_COOKIES.refresh)
  store.delete(SESSION_COOKIES.codeSentAt)
}

export function writeCodeSentAt(store: CookieStore, nowMs: number): void {
  store.set(
    SESSION_COOKIES.codeSentAt,
    String(nowMs),
    sessionCookieOptions(CODE_SENT_AT_MAX_AGE)
  )
}

export function readCodeSentAt(store: CookieStore): number | null {
  const raw = store.get(SESSION_COOKIES.codeSentAt)?.value
  if (raw === undefined || !/^\d+$/.test(raw)) return null
  const value = Number(raw)
  return Number.isSafeInteger(value) ? value : null
}
