import type { Route } from "next"

/** Where auth flows send the user. */
export const AUTH_ROUTES = {
  map: "/map",
  // TODO(T091): drop the cast once the /verify-email route exists (typed routes reject it until then).
  verifyEmail: "/verify-email" as Route,
  // TODO(T068): drop the cast once the /login route exists.
  sessionExpired: "/login?reason=session_expired" as Route,
} as const satisfies Record<string, Route>
