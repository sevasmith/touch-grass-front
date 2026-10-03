import { z } from "zod"

import type { AuthErrorCode } from "./auth-error"

/** Every `?error=` value the backend documents for /oauth/complete. */
export const OAuthErrorCodeSchema = z.enum([
  "access_denied",
  "email_already_in_use",
  "too_many_requests",
  "oauth_failed",
])
export type OAuthErrorCode = z.infer<typeof OAuthErrorCodeSchema>

export const OAuthCompleteParamsSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("token"), token: z.string().min(1) }),
  z.object({ kind: z.literal("error"), error: OAuthErrorCodeSchema }),
])
export type OAuthCompleteParams = z.infer<typeof OAuthCompleteParamsSchema>

export const OAUTH_PARAM_ERRORS = {
  access_denied: "OAUTH_ACCESS_DENIED",
  email_already_in_use: "OAUTH_EMAIL_IN_USE",
  too_many_requests: "OAUTH_RATE_LIMITED",
  oauth_failed: "OAUTH_FAILED",
} as const satisfies Record<OAuthErrorCode, AuthErrorCode>

type SearchParamValue = string | string[] | undefined

const first = (value: SearchParamValue) =>
  Array.isArray(value) ? value[0] : value

/** `{ token }` wins; otherwise a documented error; anything else becomes `oauth_failed`. */
export function parseOAuthCompleteParams(
  searchParams: Record<string, SearchParamValue>
): OAuthCompleteParams {
  const token = z.string().min(1).safeParse(first(searchParams.token))
  if (token.success) return { kind: "token", token: token.data }
  const error = OAuthErrorCodeSchema.safeParse(first(searchParams.error))
  return { kind: "error", error: error.success ? error.data : "oauth_failed" }
}
