export const SESSION_COOKIES = {
  access: "tg_at",
  refresh: "tg_rt",
  codeSentAt: "tg_code_sent_at",
} as const

export const CODE_SENT_AT_MAX_AGE = 15 * 60

/**
 * Single-use link tokens that the proxy moves out of the URL, so they never show in the address
 * bar or history. Each cookie is scoped to the one page that reads it.
 */
export const HANDOFF_COOKIES = {
  "/oauth/complete": "tg_oauth_token",
  "/reset-password": "tg_reset_token",
} as const
export type HandoffRoute = keyof typeof HANDOFF_COOKIES

/** Only has to outlive the redirect and the first render of the page. */
export const HANDOFF_MAX_AGE = 5 * 60

/** Attributes for every session cookie (constitution: Session Storage). */
export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge,
    secure: process.env.NODE_ENV === "production",
  } as const
}
