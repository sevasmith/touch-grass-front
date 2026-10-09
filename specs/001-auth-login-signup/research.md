# Phase 0 Research: Authentication — Login, Signup, Email Verification & Google Sign-In

**Feature**: `001-auth-login-signup` | **Date**: 2026-10-01 (R2, R14 revised 2026-10-09) | **Plan**: [plan.md](./plan.md)

Inputs: [spec.md](./spec.md), `.specify/memory/constitution.md` v1.6.0, `docs/backend-readme.md`,
Figma node `1:2` (file `xDvS7vVu6JmMLjG1J27idD`), and user decisions captured 2026-10-01:

| Question                  | User decision                                                                                                                                                                                                                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production runtime        | **Vercel / serverless**                                                                                                                                                                                                                                                                                   |
| Refresh-coordinator store | **Upstash Redis** via the Vercel Marketplace, called over REST with `fetch` (no SDK). Approves this new third-party service (constitution I). **Revised 2026-10-09: not used for now**; the in-memory store runs everywhere and the backend's 20-second refresh replay window covers other instances (R2) |
| Secrets check             | ~~On Vercel only~~ **Revised 2026-10-09**: no secrets are required anywhere. `SESSION_CACHE_KEY` is required only if Upstash is set (R14)                                                                                                                                                                 |
| OTP entry                 | **shadcn `input-otp`** (approves the `input-otp` npm dependency)                                                                                                                                                                                                                                          |
| Google button             | **One full-width labelled button**: Google logo + "Continue with Google"                                                                                                                                                                                                                                  |
| Out-of-scope destinations | **Minimal placeholders**: protected `/map` with Log out; `/` → `/map`; footer and help icon are static, non-link decoration                                                                                                                                                                               |

---

## R1. Backend-for-Frontend mechanism

**Decision**: Use **Server Actions** for every auth mutation (login, signup, verify, resend, forgot,
reset, OAuth exchange, logout). Use **`proxy.ts`** (Next 16's renamed middleware, Node.js runtime by
default) for tier routing and refresh on navigation. **No `app/api/*` route handlers** are needed for
this feature.

**Rationale**:

- Server Actions can write cookies, and Next.js gives them a built-in `Origin` check. That check
  satisfies the constitution's CSRF rule for free, as long as it stays enabled.
- The browser never receives tokens. An action returns only a discriminated result
  (`{ ok: true, redirectTo } | { ok: false, error }`).
- Proxy is the only place that runs before every page navigation (including RSC prefetches) and can
  also write cookies. Refresh MUST NOT happen in Server Components, so proxy is where a stale
  access token gets refreshed before rendering.
- Proxy can forward the refreshed cookies to the downstream render through
  `NextResponse.next({ request: { headers } })`, so RSCs in the same request read the new pair.

**Alternatives considered**:

- _Route handlers (`app/api/auth/*`) + React Query `fetch`_: these would need hand-written `Origin`
  checks on every handler and duplicate what Server Actions already provide. Rejected.
- _Refresh inside RSC_: forbidden by the constitution, because RSCs cannot set cookies.

**Caveat noted**: The Next 16 docs warn that Proxy is "not intended as a full session management
solution". Here Proxy makes **optimistic** tier redirects and keeps the cookie pair fresh. The
backend's guards remain the real authorization, and every BFF call still handles `401`/`403`
itself (R4).

## R2. Single-flight, rotation-safe refresh on Vercel (serverless)

**Revised 2026-10-09.** The first version of this decision provisioned Upstash Redis so that refresh
was single-flight across every Vercel instance. The backend has since added a **20-second replay
window** to `POST /auth/refresh` (`docs/backend-readme.md`), and Upstash is dropped for now.

**Problem**: Refresh tokens are single-use and rotate. Sending a rotated token again revokes
**all** of the user's sessions, except within 20 seconds of the rotation: there the backend answers
`200` with the **same** new refresh token (and a freshly signed access token). On Vercel, concurrent
requests from one browser can land on different function instances. There is also the **laggard
request**: a request sent with the _old_ cookie just before the browser applied the new
`Set-Cookie`.

**Decision**: A **refresh coordinator that is single-flight within each instance**, backed by an
in-memory store. Across instances, the backend's replay window gives every parallel or laggard
refresh the same new refresh token, so no shared store is needed. All keys are derived from
`sha256(oldRefreshToken)`:

1. Check `rt:result:{h}` first. If it is present, use the cached outcome. This handles laggards and
   lock losers on the same instance without another backend call.
2. Otherwise `SET rt:lock:{h} <requestId> NX PX 10000`.
   - **Winner**: call `POST /auth/refresh`.
     - `200`: write `rt:result:{h}` = encrypted `{ kind: "ok", pair }` with `PX 30000`, then return
       the pair.
     - `401` (including `Session expired`, the backend's 90-day absolute session lifetime): write
       `rt:result:{h}` = `{ kind: "revoked" }` with `PX 30000`, then return revoked.
     - Transient failure (network, `5xx`, `429`): `DEL rt:lock:{h}`, write no result, and return a
       transient error. The session is **not** cleared.
   - **Loser**: poll `rt:result:{h}` every 100 ms for up to 4 s. If the lock disappears without a
     result, retry acquiring it once. If it times out, return a transient error.
3. The cached pair is encrypted with **AES-256-GCM via Web Crypto** (`globalThis.crypto.subtle`,
   with no dependency). Without `SESSION_CACHE_KEY`, each process generates a random key, which is
   enough because the memory store is per process too. Together with the hashed key and the 30 s
   TTL, this is the refresh-coordination exception in constitution v1.6.0 (Scope; Security →
   Session Storage).

The coordinator depends on a tiny `KeyValueStore` port (`get`, `setNx`, `set`, `del`). It has two
adapters:

- `memoryStore`: a `globalThis`-scoped `Map` with TTLs. Used everywhere for now: Vercel, local
  `next dev` / `next build` / `next start`, and Vitest.
- `upstashStore`: REST over `fetch`, with Zod-validated responses. Built before the backend added
  the replay window and kept, unused, so a shared store can be switched on by setting both Upstash
  variables and `SESSION_CACHE_KEY` (R14). It would make refresh single-flight across instances
  too and save the duplicate backend calls.

Both adapters run through the **same** coordinator code path, and the tests exercise it with the
memory store.

**Known limit**: after a transient failure where the backend did rotate the token (the response
was lost), the next request retries with the old token. Within 20 seconds the replay window answers
it; later, the backend treats it as a reuse and ends every session. This was worse before the
window existed (any retry was a reuse), and the coordinator cannot tell a lost response from a
refresh that never happened.

**Rationale**: The replay window removes the cross-instance problem the shared store solved, so the
in-memory store is the smallest design that meets FR-011–FR-013 and SC-006. The 30 s result TTL
covers laggards on the same instance. The 10 s lock TTL is longer than the 8 s backend timeout
(R9).

**Alternatives considered**:

- _Upstash Redis as a shared store_ (the original decision): single-flight across instances, but a
  new service and secrets that the replay window makes unnecessary for now.
- _No coordinator, rely on the replay window alone_: works, but every concurrent request on an
  instance would call the backend and spend the 20/min refresh rate limit. The backend recommends
  de-duplicating where possible.
- _`@upstash/redis` SDK_: convenient, but it is a new dependency for 4 commands. Plain `fetch` is
  enough.
- _Proactive refresh using a stored expiry_: tokens are opaque and must not be decoded, and a
  password reset invalidates tokens early anyway. Rejected. Refresh is reactive, on `401`.

**Infra action required** (tasks T008a): none for the coordinator. Only `NEXT_PUBLIC_API_URL`
needs to be set on Vercel (R14).

## R3. Session cookies

**Decision**: Use two cookies set only by Server Actions or Proxy: `tg_at` (access token) and
`tg_rt` (refresh token). Both are `HttpOnly; SameSite=Lax; Path=/`, with `Secure` when
`NODE_ENV=production`, and `Max-Age` = 30 days (`SESSION_COOKIE_MAX_AGE`, which mirrors the
backend's `JWT_REFRESH_TTL`). A third non-secret cookie, `tg_code_sent_at` (HttpOnly, 15 min),
stores when the last verification code was sent so the 60 s resend cooldown survives reloads.
Signup and resend set it.

Full spec: [contracts/session-and-proxy.md](./contracts/session-and-proxy.md).

**Rationale**: This follows the constitution's _Session Storage_ rule. The access cookie lives as
long as the refresh cookie because an expired access token simply produces a `401` and triggers a
refresh. `__Host-` prefixes were considered, but they break `http://localhost` development. We can
revisit them later.

## R4. Server-side backend client, `401` refresh-retry, and global `403`

**Decision**: `shared/api/backend-fetch.ts` is server-only. It handles:

- the base URL
- a JSON body
- `AbortSignal.timeout(8000)`
- forwarding `X-Forwarded-For` from the incoming request
- Zod parsing of success bodies, and of the error body with the shared `ApiErrorSchema`

It returns a typed `Result`. It **never throws** for HTTP or network errors (constitution VIII).

`entities/session` builds `authedFetch` on top of it:

1. Attach `Authorization: Bearer <tg_at>`.
2. On `401`, consult `isSessionFailure(error)` (default: always `true`). If the error is a session
   failure, run the coordinator refresh **once**, write the new cookies, and retry **once**. A `401`
   on the retry is classified again with `isSessionFailure`: a session failure clears the cookies
   and returns `SESSION_EXPIRED`; a business `401` (e.g. a wrong verification code) is returned
   unchanged and the new pair stays in the cookies.
3. If the refresh returns revoked, clear the cookies and return `SESSION_EXPIRED`. The caller
   `redirect("/login")`s.
4. On `403` with `message === "Email not verified"`, return `EMAIL_NOT_VERIFIED`. The caller
   `redirect("/verify-email")`s. This is the single global handler (FR-020).

The `verify-email` call passes an `isSessionFailure` that returns `false` for the four
code-specific messages. Code errors are therefore never refreshed-and-retried (FR-014, SC-011).
Public endpoints (login, signup, forgot, reset, exchange) use `backendFetch` directly, with no
refresh.

## R5. Tier routing in Proxy

**Decision**: `proxy.ts` (root) re-exports the handler from `src/_app/proxy/`. The matcher excludes
`_next/static`, `_next/image`, `favicon.ico`, `images/`, and `icons/`. For each matched **GET**
navigation (document or RSC request; requests carrying `Next-Action` are skipped):

1. Resolve the route's tier from `ROUTE_TIERS` (default **verified**).
2. **Public routes**:
   - `/login` and `/register`: if session cookies exist, resolve `me` and redirect to `/map` or
     `/verify-email`.
   - All other public routes pass through without a backend call.
3. **Unverified and verified routes**:
   - No cookies: redirect to `/login`.
   - Otherwise `GET /auth/me`. On `401`, run the coordinator refresh and retry once.
   - Refresh revoked: clear the cookies and redirect to `/login`.
   - Transient failure: **rewrite** to `/session-unavailable` (URL kept, session kept, Retry
     button).
   - Then apply the tier: unverified on a verified route goes to `/verify-email`, and verified on
     `/verify-email` goes to `/map`.
4. If a refresh happened, set the new cookies on both the response and the forwarded request.

`GET /auth/me` adds one backend round trip per protected navigation. That is acceptable at this
scope, and it is the only non-decoding way to learn `emailVerified`. A cache can come later if it is
needed.

## R6. Google OAuth completion (`/oauth/complete`)

**Decision**: The proxy answers `GET /oauth/complete?token=…` with a `307` to the bare URL and
moves the token into the `tg_oauth_token` cookie (HttpOnly, `path=/oauth/complete`, 5 min), so the
token never appears in the address bar or history. (A client-side `history.replaceState` after
hydration left it visible for a moment; found in T127.) The RSC page reads the cookie and `?error=`,
validates them with Zod (`OAuthCompleteParamsSchema`), and passes `{ token } | { error }` to the
client component `OAuthCompleteHandler`. That component, inside a `useEffect`:

1. Guards with `const started = useRef(false)` so it runs exactly once under React StrictMode.
2. Calls the `exchangeOAuthToken(token)` Server Action. The action deletes the cookie, calls `POST /auth/oauth/exchange`,
   sets the cookies, and calls `GET /auth/me`. It returns `redirectTo` (`/map` or `/verify-email`) or
   an error code.

Errors render `OAuthErrorCard`, with copy mapped per code and a "Try again" button that starts
Google again (R7) plus a link back to `/login`. A missing token **and** missing error maps to
`oauth_failed`. A malformed or unknown `error` value also maps to `oauth_failed`.

**Rationale**: This matches the backend README's prescribed flow and the constitution's
URL-borne-token rule. The handoff token is not a session token, so passing it briefly through
client JS is allowed. Session tokens still never reach the browser.

**Alternative considered**: Doing the exchange inside Proxy or a GET route handler and redirecting
(fully server-side). That would make a state-changing GET depend on the URL, mix business logic into
Proxy, and drift from the spec's "completion page shows the message" scenarios. Rejected.

**Known risk (backend-level, documented, not fixable here)**: A leaked, unexpired handoff token
could log a victim into the attacker's account (login CSRF). Its 60 s TTL and single use limit this.
It is the same exposure the backend README's reference flow has.

## R7. Starting Google sign-in

**Decision**: `GoogleSignInButton` renders a plain `<a href={`${NEXT_PUBLIC_API_URL}/auth/google`}>`
styled as an outline `Button` (shadcn `render`/`asChild` pattern for Base UI). It is a full-page
navigation, never `fetch` (FR-022), and it is full width with the Google logo and the label
"Continue with Google" (user decision). Because it is a link, it needs no `"use client"`.

## R8. Forms, validation, and pending state

**Decision**: Use React Hook Form 7 with `zodResolver` and `mode: "onTouched"`. That surfaces errors
on blur, which meets SC-003's 300 ms target. Form schemas live in `features/auth/model/`, and the
same schemas re-validate inside each Server Action (the action input is an untrusted boundary).

Mutations are wrapped in TanStack Query `useMutation` hooks in `features/auth/api/`. These give
`isPending` for disabled buttons and spinners (FR-038). On `{ ok: true, redirectTo }` the hook calls
`router.replace(redirectTo)`, and Proxy then re-checks the tier. On `{ ok: false }`, form-level
errors render in an `Alert` and field errors through `form.setError`. A rejected action call
(offline, deployment skew, timeout) is logged and mapped to `NETWORK_ERROR`, so it is never silent.

A `QueryClientProvider` is added once in `src/_app/providers/`.

Server Actions return results instead of calling `redirect()`. This keeps `useMutation` promises
settled and makes the actions unit-testable.

## R9. Timeouts and network errors

**Decision**: Every backend call uses an 8 s timeout. An abort or network failure maps to
`NETWORK_ERROR`, which shows "We couldn't reach Touch Grass. Check your connection and try again."
with the form still enabled for retry. `5xx` (other than resend's `503`) maps to `SERVER_ERROR`
with similar copy. Errors are logged server-side with `console.error` and a scrubbed context: never
log tokens, codes, or passwords.

## R10. Verification code UI and cooldown

**Decision**: Use shadcn `input-otp` (`InputOTP`, six slots) with `pattern={REGEXP_ONLY_DIGITS}`,
`maxLength={6}`, and `autoComplete="one-time-code"`. The value is held as a **string**, so leading
zeros are preserved (FR-017). Submission is explicit (button or Enter). There is **no auto-submit on
the 6th digit**, which avoids accidentally consuming an attempt twice.

The cooldown comes from the `tg_code_sent_at` cookie. The RSC computes `cooldownEndsAt` and passes
it to `ResendCodeButton`, which ticks with `setInterval`. Arriving from signup therefore starts in
cooldown. Arriving from login or a `403` starts enabled (no cookie). A `429` or `503` from resend
sets the cookie, since the backend's cooldown applies, and starts the countdown.

## R11. Design tokens, fonts, and assets (Figma `1:2`)

**Decision**:

- **Fonts**: load `Manrope` (600 and 700) and `Hanken_Grotesk` (400 and 600) through `next/font/google`
  in `app/layout.tsx`, replacing Geist. Map them to `--font-heading` and `--font-sans` in `@theme`.
- **Tokens** go into `src/_app/globals.css` by remapping the existing shadcn variables in `:root`, so
  that primitives pick them up with no per-component overrides:

  | Figma value                   | Token                                                     |
  | ----------------------------- | --------------------------------------------------------- |
  | `#faf9f7` panel bg            | `--background`                                            |
  | `#1a1c1b` heading text        | `--foreground`                                            |
  | `#424844` body/labels         | `--muted-foreground`                                      |
  | `#1a3026` primary btn         | `--primary` (fg `#ffffff`)                                |
  | `#f4f3f1` input bg            | `--input-background` (new) → `bg-input-background`        |
  | `#c2c8c3` decorative borders  | `--border`                                                |
  | `#c2c8c3` input borders       | `--input` = `#888c88` (AA fix: 1.6:1 → 3.2:1)             |
  | `#051b12` links               | `--link` (new) → `text-link`                              |
  | `#6b7280` placeholder         | `--placeholder` (new) = `#646b78` (AA fix: 4.4:1 → 4.8:1) |
  | (no focus state in Figma)     | `--ring` = `#1a3026` (shadcn's default ring is 2.5:1)     |
  | `#e9e8e6` image fallback      | `--hero-fallback` (new)                                   |
  | radius 4px inputs, 8px button | `rounded-sm` / `rounded-lg` with `--radius: 0.5rem`       |

  Three tokens deliberately differ from Figma so they pass WCAG AA (constitution X). The spec lists
  them under Assumptions (Figma deviations).

- **Typography**: H1 is Manrope Bold 32/38.4. The subtitle is Hanken 16/24. Labels are Hanken
  SemiBold 12/12 with tracking 1.2px. Links are Hanken SemiBold 14/20. The button is Hanken SemiBold
  18/28.8. The hero title is Manrope SemiBold 80/100, white, with text-shadow `0 2px 4px #0003`.
- **Layout**: two equal columns at `lg` (≥1024px) and up. The left image panel is `hidden lg:block`
  per the Figma layer name. The form column is centered at `max-w-[440px]` with `p-20`, and the
  footer is pinned to the bottom of the right panel. Mobile-first: the single column uses `px-4`.
- **Assets**: download the hero image, the Google logo, and the help-icon SVG from the Figma MCP into
  `public/images/auth-hero.jpg`, `public/icons/google.png`, and `public/icons/help.svg`. Render with
  `next/image` (`priority` for the hero, a fixed-size box to avoid layout shift, per SC-009).
  GitHub and Discord assets are **not** used (FR-026).
- **Asset outcome (T006, 2026-10-02)**: the hero's original upload in Figma is a 343×512 JPEG, so
  it is saved as `auth-hero.jpg` (the true format) rather than an upscaled PNG. It will look soft on
  the 640px-wide panel, especially on high-DPI screens; a higher-resolution source is a design
  follow-up. The Google logo's source is a JPEG with an opaque white background, so `google.png` is
  the node's transparent PNG export at 2× (48×48) for a 24px slot.
- The footer and help icon are static and decorative (user decision). The help icon is
  `aria-hidden`, and the footer "links" are plain text.

## R12. shadcn/ui primitives

**Decision**: Before any form work, run:
`npx shadcn@latest add input label field input-otp alert spinner separator`.
Targets resolve to `src/shared/ui/` via `components.json`.

- `input-otp` brings the approved `input-otp` dependency.
- If a component is not in the `base-nova` registry, fall back to the closest available one
  (`field` → `label` + RHF `Controller` markup) and record the substitution.
- The pre-existing `src/shared/components/ui/button.tsx` **violates** constitution II (nested
  `shared/components/ui`). Move it to `src/shared/ui/button.tsx` (re-adding it via shadcn is
  acceptable) and update the `vitest.config.ts` coverage exclude to `src/shared/ui/**`.

**Outcome (T002, 2026-10-02)**: all seven components exist in `base-nova`, so nothing was
substituted. The CLI (`shadcn@4.21.1`) wrote `import { cn } from "cn"` into every generated file and
installed the unrelated npm package `cn`. That package was removed (unapproved dependency) and the
imports were restored to `@/shared/lib/utils`. Check for this after every future `shadcn add`.

## R13. `server-only` guard

**Decision**: Every module that touches cookies, tokens, env secrets, or the backend starts with
`import "server-only"`. Next 16 ships a compiled `server-only` and aliases the import, so no
dependency is needed. Verify this during the first task. If the alias does not resolve under Vitest,
add a `resolve.alias` stub in `vitest.config.ts`; do not install the package.

## R14. Environment variables

Validated with Zod in `src/shared/config/env.server.ts` (server) and `env.public.ts` (client-safe):

| Var                        | Scope  | Required         | Purpose                                     |
| -------------------------- | ------ | ---------------- | ------------------------------------------- |
| `NEXT_PUBLIC_API_URL`      | public | always           | Backend base URL (Google nav + BFF calls)   |
| `UPSTASH_REDIS_REST_URL`   | server | no (unused)      | Optional shared coordinator store           |
| `UPSTASH_REDIS_REST_TOKEN` | server | no (unused)      | Optional shared coordinator store auth      |
| `SESSION_CACHE_KEY`        | server | with Upstash     | base64 32-byte AES-GCM key for cached pairs |
| `SESSION_COOKIE_MAX_AGE`   | server | no (default 30d) | Cookie lifetime in seconds                  |

No secrets are required anywhere, so local builds, the pre-push hook, CI builds, and Vercel
deployments need only `NEXT_PUBLIC_API_URL`. Set both Upstash variables or neither. If they are
set, `SESSION_CACHE_KEY` is required too, because instances sharing a store must share the key that
encrypts its entries.

Backend counterpart settings: `FRONTEND_URL` = the frontend origin (scheme must match). The frontend
no longer needs to be in `CORS_ORIGINS`, because all calls are server-side.

## R15. Rate limiting behind the BFF (open dependency)

`backendFetch` forwards `X-Forwarded-For`. It takes the first hop from the incoming
`x-forwarded-for`, which Vercel sets and overwrites, so clients cannot spoof it. The **backend**
still has to trust the proxy and use that header. That is constitution TODO `BACKEND_RATE_LIMIT_IP`
and remains a production blocker owned by the backend repo. It does not block this plan.

## R16. Testing strategy (TDD, constitution VI)

- **Unit (Vitest)**: Zod schemas; the error mapper (every backend status and message → `AuthErrorCode`);
  the refresh coordinator with `memoryStore` and fake timers (winner/loser, laggard, revoked,
  transient, lock-vanish); `authedFetch` (401→refresh→retry once, verify-email code 401 not retried,
  403 mapping); the AES-GCM round-trip; the (optional) Upstash adapter against a mocked `fetch`.
- **Server Actions**: `vi.mock("next/headers")` for `cookies()` and `headers()`, plus a mocked
  `fetch`. Assert cookie writes and returned results.
- **Proxy**: call the handler with `new NextRequest(url, { headers: { cookie } })` and a mocked
  `fetch`. Assert redirects, rewrites, and `Set-Cookie`.
- **Components (Testing Library, happy-dom)**: form validation messages, pending state, error
  rendering, the OAuth handler running exactly once under `<StrictMode>`, `replaceState` called
  before the action, and the resend countdown.
- **No E2E framework** (it would be a new dependency). End-to-end flows are validated manually per
  [quickstart.md](./quickstart.md).
