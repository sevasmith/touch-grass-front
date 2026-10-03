import type { Route } from "next"

/** Where auth flows send the user. */
export const AUTH_ROUTES = {
  map: "/map",
  verifyEmail: "/verify-email",
  login: "/login",
  sessionExpired: "/login?reason=session_expired",
} as const satisfies Record<string, Route>
