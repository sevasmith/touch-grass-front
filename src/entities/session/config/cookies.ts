export const SESSION_COOKIES = {
  access: "tg_at",
  refresh: "tg_rt",
  codeSentAt: "tg_code_sent_at",
} as const

export const CODE_SENT_AT_MAX_AGE = 15 * 60

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
