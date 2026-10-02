export type RouteTier = "public" | "unverified" | "verified"

/**
 * Only the looser routes are listed; anything else is "verified" (constitution: Three-Tier
 * Access, new routes default to Verified). See contracts/session-and-proxy.md.
 */
export const ROUTE_TIERS: Readonly<
  Record<string, Exclude<RouteTier, "verified">>
> = {
  "/login": "public",
  "/register": "public",
  "/forgot-password": "public",
  "/reset-password": "public",
  "/oauth/complete": "public",
  "/session-unavailable": "public",
  "/verify-email": "unverified",
}

/** Drops trailing slashes, except for the root path. */
export function normalisePathname(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname
}

export function getRouteTier(pathname: string): RouteTier {
  const normalised = normalisePathname(pathname)
  return Object.hasOwn(ROUTE_TIERS, normalised)
    ? ROUTE_TIERS[normalised]
    : "verified"
}
