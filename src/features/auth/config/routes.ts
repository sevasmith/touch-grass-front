import type { Route } from "next"

/** Where auth flows send the user. */
export const AUTH_ROUTES = {
  map: "/map",
  // TODO(T091): drop the cast once the /verify-email route exists (typed routes reject it until then).
  verifyEmail: "/verify-email" as Route,
  login: "/login",
  sessionExpired: "/login?reason=session_expired",
} as const satisfies Record<string, Route>
