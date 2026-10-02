# Contract: Server Actions (BFF surface exposed to the browser)

Every action lives in `src/features/auth/api/*.action.ts` with `"use server"` and is exported through
`@/features/auth`. Each action:

1. **Re-validates** its input with the same Zod schema the form uses. A failure returns
   `{ ok: false, error: "VALIDATION", fieldErrors }`.
2. Calls the backend through `backendFetch` or `authedFetch` (server-only).
3. Writes or clears session cookies itself. It **never** returns tokens.
4. Returns `ActionResult` and does not call `redirect()`, except where noted. The client hook calls
   `router.replace(redirectTo)`.
5. Wraps everything in `try/catch`. An unexpected throw is logged (without secrets) and returns
   `UNEXPECTED`.

Next.js's built-in Server Action `Origin` check provides CSRF protection and MUST stay enabled
(no `serverActions.allowedOrigins` widening).

| Action               | Input (schema)                               | Backend calls                                               | Cookie effects                                                     | Success result                                                 | Failure codes                                                                                                                                  |
| -------------------- | -------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `login`              | `LoginSchema`                                | `POST /auth/login` → `GET /auth/me`                         | set `tg_at`, `tg_rt`                                               | `{ ok, redirectTo: emailVerified ? "/map" : "/verify-email" }` | `INVALID_CREDENTIALS`, `TOO_MANY_ATTEMPTS`, `VALIDATION`, `NETWORK_ERROR`, `SERVER_ERROR`, `UNEXPECTED`                                        |
| `register`           | `RegisterSchema` (sends email+password only) | `POST /auth/signup`                                         | set `tg_at`, `tg_rt`, `tg_code_sent_at=now`                        | `{ ok, redirectTo: "/verify-email" }`                          | `EMAIL_TAKEN`, `RATE_LIMITED`, `VALIDATION`, `NETWORK_ERROR`, `SERVER_ERROR`, `UNEXPECTED`                                                     |
| `verifyEmail`        | `VerifyEmailSchema`                          | `POST /auth/verify-email` (authed; code 401s never retried) | refreshed pair if a session-401 refresh happened; clear on revoke  | `{ ok, redirectTo: "/map" }`                                   | `CODE_INVALID`, `CODE_EXPIRED`, `CODE_NONE_ACTIVE`, `CODE_ATTEMPTS_EXHAUSTED`, `TOO_MANY_ATTEMPTS`, `SESSION_EXPIRED`, `NETWORK_ERROR`, …      |
| `resendVerification` | none                                         | `POST /auth/resend-verification` (authed)                   | `tg_code_sent_at=now` on `204`, `429`, `503`                       | `{ ok, cooldownEndsAt }`                                       | `RESEND_COOLDOWN` (+`cooldownEndsAt`), `RATE_LIMITED`, `EMAIL_SEND_FAILED` (+`cooldownEndsAt`), `SESSION_EXPIRED`, `NETWORK_ERROR`             |
| `forgotPassword`     | `ForgotPasswordSchema`                       | `POST /auth/forgot-password`                                | none                                                               | `{ ok }` → UI shows constant confirmation                      | `RATE_LIMITED`, `VALIDATION`, `NETWORK_ERROR`, `SERVER_ERROR`                                                                                  |
| `resetPassword`      | `ResetPasswordSchema` (sends token+password) | `POST /auth/reset-password`                                 | **clear** all session cookies on `204` and on `RESET_ALREADY_USED` | `{ ok }` → UI shows success + "Log in"                         | `RESET_INVALID`, `RESET_EXPIRED`, `RESET_ALREADY_USED`, `RESET_REPLACED`, `RESET_SAME_PASSWORD`, `RATE_LIMITED`, `VALIDATION`, `NETWORK_ERROR` |
| `exchangeOAuthToken` | `z.object({ token: z.string().min(1) })`     | `POST /auth/oauth/exchange` → `GET /auth/me`                | set `tg_at`, `tg_rt`                                               | `{ ok, redirectTo: emailVerified ? "/map" : "/verify-email" }` | `OAUTH_FAILED`, `OAUTH_RATE_LIMITED`, `NETWORK_ERROR`                                                                                          |
| `logout`             | none                                         | `POST /auth/logout { refreshToken }` (result ignored)       | **clear** all session cookies (always)                             | calls `redirect("/login")`                                     | none (it always succeeds from the user's perspective)                                                                                          |

## Client hooks (`src/features/auth/api/use-*.ts`, `"use client"`)

Each hook is a thin `useMutation({ mutationFn: action })`. In `onSuccess`, a hook either
`router.replace(result.redirectTo)` or hands `{ ok: false }` back to the form. If the action call
itself **rejects** (browser offline, deployment skew such as "Failed to find Server Action", or a
function timeout), the wrapper logs it and hands `{ ok: false, error: "NETWORK_ERROR" }` to the form,
so a failure is never silent (constitution VIII). A form maps
`fieldErrors` to `setError`, and maps `error` to an `Alert` through `AUTH_ERROR_COPY`.

## Exactly-once guarantees

- `verifyEmail`: the backend checks the code at most once per user submission (FR-016). A session
  `401` is rejected before the code check, so it is refreshed and retried once; a code error is
  never retried, including one returned by that retry. The submit button is disabled while
  pending, and the 6th digit does not auto-submit.
- `exchangeOAuthToken`: the caller (`OAuthCompleteHandler`) guards with `useRef`. The action itself
  is not retried. If the call rejects, the handler shows `OAuthErrorCard` with `NETWORK_ERROR`.
