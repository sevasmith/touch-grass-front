# Quickstart & Validation Guide: Authentication

**Feature**: `001-auth-login-signup` | **Plan**: [plan.md](./plan.md)

This guide shows the feature working end to end. Contracts are in [contracts/](./contracts/), and
shapes are in [data-model.md](./data-model.md).

## Prerequisites

1. **Backend** (`touch-grass-back`) running locally on `http://localhost:6767` with Postgres
   migrated. Backend `.env` needs:
   - `FRONTEND_URL=http://localhost:3000` (http, not https)
   - `GOOGLE_CALLBACK_URL=http://localhost:6767/auth/google/callback`
   - a valid Brevo key, or watch the backend log for the code and reset link
   - short TTLs to make testing easier: `JWT_ACCESS_TTL=1m`, `OAUTH_LOGIN_TOKEN_TTL=60s`,
     `EMAIL_VERIFICATION_TTL=10m`
2. **Frontend** `.env.local`:

   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:6767
   # Optional locally (memory store is used when absent). Required on Vercel:
   # UPSTASH_REDIS_REST_URL=...
   # UPSTASH_REDIS_REST_TOKEN=...
   # SESSION_CACHE_KEY=$(openssl rand -base64 32)
   ```

3. Start the frontend with `pnpm install` and then `pnpm dev`. Open **`http://localhost:3000`**. Use
   `localhost` consistently, not `127.0.0.1`, because cookie jars are per hostname.

## Automated gates

```bash
pnpm test:run      # all unit/component/action/proxy tests green
pnpm typecheck     # no TS errors (no `any`)
pnpm lint          # ESLint clean
pnpm build         # production build succeeds with no Upstash vars (checked when the app starts on Vercel)
```

## Manual scenarios

DevTools are open throughout. After each successful sign-in, check **Application → Cookies**:
`tg_at` and `tg_rt` must show ✓ HttpOnly. In the Console, `document.cookie` must not contain `tg_`,
and `localStorage` and `sessionStorage` must contain no tokens (SC-010).

| #   | Story                       | Steps                                                                                                                                                             | Expected                                                                                                                                                                                   |
| --- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | US2 signup                  | `/register` → new email, 8+ char password and matching confirm → Sign up                                                                                          | Lands on `/verify-email`; Resend shows a ~60 s countdown                                                                                                                                   |
| 2   | US2 validation              | Submit empty; then a 7-char password; then a mismatched confirm                                                                                                   | Field errors appear on blur or submit; no request is sent (Network tab)                                                                                                                    |
| 3   | US2 duplicate               | Sign up again with the same email                                                                                                                                 | "already registered" on the email field                                                                                                                                                    |
| 4   | US3 tier guard              | While unverified, visit `/map`                                                                                                                                    | Redirected to `/verify-email`                                                                                                                                                              |
| 5   | US3 wrong code              | Enter `000000` (if it isn't the real code)                                                                                                                        | "Invalid verification code … used one of your 5 attempts"; exactly **one** `POST` in the backend log                                                                                       |
| 6   | US3 resend                  | Wait for the countdown → Resend; then click again immediately via a second tab                                                                                    | New code emailed; the old code now fails with "No valid code"; the second attempt shows the cooldown message                                                                               |
| 7   | US3 verify                  | Enter the correct code, keeping leading zeros                                                                                                                     | Redirected to `/map` with **no** call to `/auth/refresh` or `/auth/login` in the backend log                                                                                               |
| 8   | US3 verified on verify page | Visit `/verify-email`                                                                                                                                             | Redirected to `/map`                                                                                                                                                                       |
| 9   | US1 login                   | Log out → `/login` → valid credentials                                                                                                                            | `/map`                                                                                                                                                                                     |
| 10  | US1 errors                  | Wrong password; Google-only account; 6 rapid attempts                                                                                                             | "Invalid email or password" for both; then the rate-limit message                                                                                                                          |
| 11  | US1 unverified              | Log in with an unverified account                                                                                                                                 | `/verify-email`; Resend is enabled immediately                                                                                                                                             |
| 12  | Edge: authed on /login      | While logged in, visit `/login` and `/register`                                                                                                                   | Redirected to `/map`                                                                                                                                                                       |
| 13  | Refresh rotation            | With `JWT_ACCESS_TTL=1m`, wait over 1 min, then open 3 tabs of `/map` at once                                                                                     | All load. The backend log shows **exactly one** `/auth/refresh`. No user is logged out everywhere                                                                                          |
| 14  | Refresh revoked             | Reset the password from another browser, then navigate in this one                                                                                                | Redirected to `/login?reason=session_expired` with the notice                                                                                                                              |
| 15  | Transient                   | Stop the backend, then navigate to `/map`                                                                                                                         | The "We couldn't reach Touch Grass" page with Retry; cookies are still present. Restart the backend and Retry → `/map`                                                                     |
| 16  | US4 Google                  | `/login` → Continue with Google → consent                                                                                                                         | Network shows a top-level navigation to `:6767/auth/google`. Land on `/oauth/complete`, and the URL bar shows no `?token=`. Then `/map`. Browser Back does not reveal the token            |
| 17  | US4 StrictMode              | Repeat 16 in `pnpm dev`                                                                                                                                           | The backend log shows exactly **one** `POST /auth/oauth/exchange` (no "already used")                                                                                                      |
| 18  | US4 errors                  | Visit `/oauth/complete?error=access_denied`, `…=email_already_in_use`, `…=too_many_requests`, `…=oauth_failed`, `…=garbage`, and `/oauth/complete` with no params | Each shows its specific message (the last three show generic failure) plus "Try again"                                                                                                     |
| 19  | US4 bad token               | `/oauth/complete?token=not-a-token`                                                                                                                               | Generic Google failure message plus "Try again"                                                                                                                                            |
| 20  | US5 nav                     | Click "Sign up" on login; "Log in" on signup; "Forgot password?"                                                                                                  | `/register`, `/login`, `/forgot-password`                                                                                                                                                  |
| 21  | US6 forgot                  | Submit a registered email, then an unregistered one                                                                                                               | The confirmation text is identical; on the 4th submit within 15 min, the rate-limit message                                                                                                |
| 22  | US6 reset                   | Open the emailed link `/reset-password?token=…`                                                                                                                   | The URL is immediately `/reset-password`. Set a new password → success, then "log in again" (the old session is gone)                                                                      |
| 23  | US6 reset outcomes          | Reuse the same link; use an older link after requesting a newer one; set the same password as the current one                                                     | "already used" (cookies cleared), "replaced by a newer request", "must be different"                                                                                                       |
| 24  | Logout                      | `/map` → Log out                                                                                                                                                  | Cookies are gone, the backend got `POST /auth/logout`, and you are on `/login`                                                                                                             |
| 25  | Design                      | Compare `/login` at 1280×1024 with Figma node `1:2`; resize to 375px                                                                                              | Pixel match apart from the spec's Figma deviations (one full-width Google button; AA border, placeholder, and focus colors); the image panel is hidden below `lg`; no layout shift on load |

## Vercel preview validation (before production)

- Provision **Upstash Redis** through the Vercel Marketplace, and set `UPSTASH_REDIS_REST_URL`,
  `UPSTASH_REDIS_REST_TOKEN`, `SESSION_CACHE_KEY`, and `NEXT_PUBLIC_API_URL` (tasks T008a). A
  deployment without them fails on its first request.
- Point the backend's `FRONTEND_URL` at the preview URL, or at a stable preview alias.
- Repeat scenario 13 against the preview. In the Upstash data browser, `rt:result:*` keys appear and
  expire after about 30 s.
- **Blocked for production** until the backend trusts `X-Forwarded-For` (constitution TODO
  `BACKEND_RATE_LIMIT_IP`).
