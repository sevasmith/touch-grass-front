import { NextResponse, type NextRequest } from "next/server"

import {
  clearHandoffToken,
  clearSession,
  isHandoffRoute,
  readSession,
  refreshSession,
  writeHandoffToken,
  writeTokenPair,
  type CookieStore,
  type TokenPair,
} from "@/entities/session"
import { getCurrentUser, type CurrentUser } from "@/entities/user"

import { getRouteTier, normalisePathname } from "./route-tiers"

// Tier routing and session refresh on every navigation (contracts/session-and-proxy.md). These
// redirects are optimistic: the backend's guards stay the real authorization.

const AUTH_ENTRY_ROUTES = new Set(["/login", "/register"])

type Resolution =
  | { kind: "ok"; user: CurrentUser; pair?: TokenPair }
  | { kind: "transient"; pair?: TokenPair }
  | { kind: "revoked" }

/** What to do with the session cookies on both the response and the forwarded request. */
type CookieEffect = { pair?: TokenPair } | { clear: true }

export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (request.method !== "GET" || request.headers.has("next-action")) {
    return NextResponse.next()
  }

  const handoff = handOffLinkToken(request)
  if (handoff) return handoff

  const { pathname } = request.nextUrl
  const tier = getRouteTier(pathname)
  const session = readSession(forwardedCookies(request))

  if (tier === "public") return handlePublicRoute(request, pathname, session)
  if (!session) return redirectTo(request, "/login")
  return handleProtectedRoute(request, tier, await resolveMe(session))
}

/**
 * `/oauth/complete?token=…` and `/reset-password?token=…`: moves the single-use token into a
 * cookie scoped to that page and redirects to the bare URL, so the token never reaches the
 * address bar or history. A missing, empty or repeated token clears any stale one.
 */
function handOffLinkToken(request: NextRequest): NextResponse | null {
  const route = normalisePathname(request.nextUrl.pathname)
  const tokens = request.nextUrl.searchParams.getAll("token")
  if (!isHandoffRoute(route) || tokens.length === 0) return null

  const url = request.nextUrl.clone()
  url.searchParams.delete("token")
  const response = NextResponse.redirect(url)
  const [token] = tokens
  if (tokens.length === 1 && token) {
    writeHandoffToken(response.cookies, route, token)
  } else {
    clearHandoffToken(response.cookies, route)
  }
  return response
}

/** Public routes pass through; only /login and /register bounce an existing session. */
async function handlePublicRoute(
  request: NextRequest,
  pathname: string,
  session: TokenPair | null
): Promise<NextResponse> {
  if (!session || !AUTH_ENTRY_ROUTES.has(normalisePathname(pathname))) {
    return NextResponse.next()
  }

  const resolution = await resolveMe(session)
  if (resolution.kind === "revoked") {
    return respond(request, { clear: true }, () => passThrough(request))
  }
  if (resolution.kind === "transient") {
    // The login page stays usable when the session can't be checked.
    return respond(request, resolution, () => passThrough(request))
  }
  return respond(request, resolution, () =>
    redirectTo(
      request,
      resolution.user.emailVerified ? "/map" : "/verify-email"
    )
  )
}

function handleProtectedRoute(
  request: NextRequest,
  tier: "verified" | "unverified",
  resolution: Resolution
): NextResponse {
  if (resolution.kind === "revoked") {
    return respond(request, { clear: true }, () =>
      redirectTo(request, "/login?reason=session_expired")
    )
  }
  if (resolution.kind === "transient") {
    // Keep the URL and the session; the page offers a retry.
    return respond(request, resolution, () =>
      NextResponse.rewrite(new URL("/session-unavailable", request.url))
    )
  }

  const target = tierRedirect(tier, resolution.user)
  return respond(request, resolution, () =>
    target ? redirectTo(request, target) : passThrough(request)
  )
}

function tierRedirect(
  tier: "verified" | "unverified",
  user: CurrentUser
): string | null {
  if (tier === "verified" && !user.emailVerified) return "/verify-email"
  if (tier === "unverified" && user.emailVerified) return "/map"
  return null
}

/** `GET /auth/me`; on a 401, one coordinated refresh and one retry with the new token. */
async function resolveMe(session: TokenPair): Promise<Resolution> {
  const first = await getCurrentUser(session.accessToken)
  if (first.ok) return { kind: "ok", user: first.user }
  if (first.reason === "transient") return { kind: "transient" }

  const refreshed = await refreshSession(session.refreshToken)
  if (refreshed.kind !== "ok") return refreshed

  // From here on the old refresh token is dead, so the new pair must reach the browser
  // whatever /auth/me says next (unless the session turns out to be revoked).
  const { pair } = refreshed
  const retry = await getCurrentUser(pair.accessToken)
  if (retry.ok) return { kind: "ok", user: retry.user, pair }
  if (retry.reason === "transient") return { kind: "transient", pair }
  return { kind: "revoked" }
}

/**
 * Applies the cookie effect to the forwarded request first (so the RSC render in this same
 * request reads the new pair), then builds the response and applies it there too.
 */
function respond(
  request: NextRequest,
  effect: CookieEffect,
  build: () => NextResponse
): NextResponse {
  applyEffect(forwardedCookies(request), effect)
  const response = build()
  applyEffect(response.cookies, effect)
  return response
}

function applyEffect(store: CookieStore, effect: CookieEffect): void {
  if ("clear" in effect) clearSession(store)
  else if (effect.pair) writeTokenPair(store, effect.pair)
}

/** `NextRequest.cookies` ignores cookie options, so it needs a thin adapter (see T025). */
function forwardedCookies(request: NextRequest): CookieStore {
  return {
    get: (name) => request.cookies.get(name),
    set: (name, value) => request.cookies.set(name, value),
    delete: ({ name }) => request.cookies.delete(name),
  }
}

function passThrough(request: NextRequest): NextResponse {
  return NextResponse.next({ request: { headers: request.headers } })
}

function redirectTo(request: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.url))
}
