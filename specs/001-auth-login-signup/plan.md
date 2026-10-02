# Implementation Plan: Authentication — Login, Signup, Email Verification & Google Sign-In

**Branch**: `feat/login-page` (spec dir `001-auth-login-signup`) | **Date**: 2026-10-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-auth-login-signup/spec.md`, plus
`docs/backend-readme.md` (API source of truth), constitution v1.5.0, and Figma node `1:2`
(file `xDvS7vVu6JmMLjG1J27idD`).

## Summary

Build the auth surface of the Touch Grass frontend against the NestJS backend:

- `/login`, `/register`, and `/verify-email` (6-digit OTP with a resend cooldown)
- `/forgot-password` and `/reset-password`
- `/oauth/complete` for Google sign-in
- a protected placeholder `/map` with Log out

The Next.js server acts as a **Backend-for-Frontend**:

- **Server Actions** perform every auth mutation and own the `HttpOnly` session cookies
  (`tg_at`, `tg_rt`). Tokens never reach browser JavaScript.
- **`proxy.ts`** enforces the three access tiers on every navigation by calling `GET /auth/me`.
  On a `401` it refreshes through a **distributed, rotation-safe, single-flight refresh
  coordinator**. Because production runs on **Vercel (serverless)**, the coordinator is backed by
  **Upstash Redis over plain `fetch`**: a new third-party service (approved by the user on
  2026-10-01), but no new npm package.

Forms use React Hook Form with Zod, and React Query `useMutation` wraps the Server Actions. The UI
follows the Figma split-screen design (Manrope / Hanken Grotesk, `#1a3026` primary), with a single
full-width "Continue with Google" button and shadcn `input-otp` for the code.

Research and decisions: [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 6 (strict), ESM; React 19.2; Node.js runtime for Proxy and Server
Actions

**Primary Dependencies**: Next.js 16.3 (App Router, RSC, Server Actions, `proxy.ts`), shadcn/ui v4
(`base-nova`, Base UI), Tailwind v4, React Hook Form 7 + `@hookform/resolvers`, Zod 4, TanStack
Query 5, Lucide. **New dependencies, approved by the user on 2026-10-01**: the `input-otp` npm
package (via `npx shadcn add input-otp`) and the **Upstash Redis** service (REST over `fetch`,
provisioned through the Vercel Marketplace; no SDK).

**Storage**:

- Browser: `HttpOnly` cookies only (`tg_at`, `tg_rt`, `tg_code_sent_at`).
- Server: **Upstash Redis (REST)** for refresh-coordinator lock and result keys, with a 30 s TTL and
  AES-GCM encryption. It is required on Vercel deployments (`VERCEL=1`); local dev, tests, and
  local production builds use an in-memory store.
- No database. The backend owns all persistence, and the coordinator cache holds no domain data.

**Testing**: Vitest 4 + Testing Library + happy-dom (`pnpm test:run`). Server Actions and Proxy are
unit-tested with mocked `next/headers` and `fetch`. End-to-end validation is manual via
[quickstart.md](./quickstart.md), because adding an E2E framework would be a new dependency.

**Target Platform**: Vercel (serverless Node functions), evergreen browsers, mobile-first responsive

**Project Type**: Web application, frontend only (BFF on the Next.js server runtime)

**Performance Goals**:

- Login → `/map` in under 10 s (SC-001), so one extra `/auth/me` round trip per protected
  navigation is acceptable.
- Field validation feedback in under 300 ms (SC-003): RHF `onTouched`, client-side only.
- Zero layout shift on auth pages (SC-009).

**Constraints**:

- Tokens are opaque and must never be decoded.
- Refresh is single-use with reuse → global revoke, so it MUST be single-flight across serverless
  instances.
- Refresh only happens in Proxy and Server Actions, never in an RSC.
- Only a refresh the backend rejects (`401`) clears the session. A transient failure (network,
  `5xx`, `429`) keeps it (constitution v1.4.0, FR-013).
- Secrets (the Upstash vars and `SESSION_CACHE_KEY`) are checked when the app starts on Vercel,
  never during `next build`, so local builds, the pre-push hook, and CI builds need no secrets.
- The CSRF `Origin` check stays on.
- Backend timeouts are 8 s.
- `X-Forwarded-For` is forwarded (the backend side is still open: TODO `BACKEND_RATE_LIMIT_IP`).

**Scale/Scope**: 7 routes plus 1 rewrite-only route, about 9 Server Actions, 1 proxy, and
2 entities, all in a single `features/auth` slice.

All Technical Context items are resolved. There are no remaining NEEDS CLARIFICATION markers; the
user decisions are recorded at the top of [research.md](./research.md).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design (below)._

| #        | Principle / Rule                                                                                                                                                                                                                                                                           | Status         | How the plan complies                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope    | Frontend only; backend contract from `docs/backend-readme.md`                                                                                                                                                                                                                              | ✅             | All payloads and messages are copied from the README ([contracts/backend-api.md](./contracts/backend-api.md)). Server code is limited to the BFF proxying the external API. The only server-side state is the refresh coordinator's encrypted Upstash cache: entries live at most 30 s, hold no domain data, and exist only so the BFF can call `/auth/refresh` safely across serverless instances. Constitution v1.5.0 (Scope) explicitly classifies such a refresh-coordination cache as part of what the BFF needs to call the external API, not "database access".                          |
| I        | Stack lock; RSC default; no new deps without approval                                                                                                                                                                                                                                      | ✅             | Pages are RSCs. `"use client"` is only on forms, the OAuth handler, the resend button, and providers. The `input-otp` package and the Upstash Redis service are **approved** (2026-10-01). Upstash is called via `fetch`, so there is no SDK. `server-only` is Next-bundled.                                                                                                                                                                                                                                                                                                                    |
| II       | FSD layers, downward imports, no same-layer cross-imports, `index.ts` public APIs, shadcn flat in `shared/ui`                                                                                                                                                                              | ✅             | See Project Structure. The existing `shared/components/ui/button.tsx` **violation is fixed** by moving it to `shared/ui/`. `entities/session` and `entities/user` never import each other: `getCurrentUser` lives in `entities/user` and needs only `shared/api`. Both barrels are server-only: every consumer is server-side, and client code may only `import type` from them.                                                                                                                                                                                                                |
| III      | DRY; no API calls in presentation components                                                                                                                                                                                                                                               | ✅             | Backend calls live only in `shared/api` and `entities/*/api`, and in `features/auth/api` (actions + hooks). UI components receive hooks or props. Error copy is centralized in `AUTH_ERROR_COPY`.                                                                                                                                                                                                                                                                                                                                                                                               |
| IV       | YAGNI                                                                                                                                                                                                                                                                                      | ✅ (justified) | Only spec'd routes are built. The `/map` placeholder is required for the redirect target and logout. The coordinator + KV port is the minimum that meets FR-012 on serverless; see Complexity Tracking.                                                                                                                                                                                                                                                                                                                                                                                         |
| V        | State local; React Query for server state; **no tokens in client state**                                                                                                                                                                                                                   | ✅             | No Zustand store is needed. The `me` profile is read server-side and passed as props. Mutations go through `useMutation`. Tokens exist only in HttpOnly cookies and, for at most 30 s after a rotation, in the encrypted refresh-coordination cache that Security → Session Storage permits (v1.5.0 exception: AES-256-GCM, keyed by the old token's hash, server-side reads only).                                                                                                                                                                                                             |
| VI       | TDD                                                                                                                                                                                                                                                                                        | ✅             | `tasks.md` puts a failing test task before every task that adds behavior in `src/`; files in `app/` only render one `src/` component. The test strategy is in research §R16.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| VII      | Strict types; Zod at every boundary                                                                                                                                                                                                                                                        | ✅             | Zod covers env, backend responses, action inputs, URL params, Upstash responses, and cached records ([data-model.md](./data-model.md)). Types come from `z.infer`. No `any`.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| VIII     | Defensive errors                                                                                                                                                                                                                                                                           | ✅             | `backendFetch` returns a `Result` and never throws on HTTP or network errors. Actions use `try/catch` → `UNEXPECTED`. Proxy's transient path rewrites to `/session-unavailable`. Logs are scrubbed.                                                                                                                                                                                                                                                                                                                                                                                             |
| IX       | Loading states, no blank screens                                                                                                                                                                                                                                                           | ✅             | Disabled + spinner on every submit. `loading.tsx` on the auth route group. The OAuth page shows a "Signing you in…" spinner. The `session-unavailable` page offers Retry.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| X        | Mobile-first, a11y, WCAG AA                                                                                                                                                                                                                                                                | ✅             | Field labels, `aria-invalid`, `aria-describedby`, `role="alert"` on errors, a keyboard-navigable OTP, a labelled Google link, and a decorative hero with `alt=""`. Colours checked for AA: `#424844` on `#faf9f7` = 8.9:1; white on `#1a3026` = 14.1:1; placeholder `#646b78` on the `#f4f3f1` input fill = 4.8:1; input border `#888c88` = 3.2:1 on the page and 3.1:1 on the fill; focus ring `#1a3026` = 13.4:1. Figma's `#c2c8c3` input border (1.6:1), its `#6b7280` placeholder (4.4:1), and shadcn's default ring (2.5:1) failed and were replaced (spec Assumptions: Figma deviations). |
| Sec      | Auth redirects; sanitization; secrets server-side; HttpOnly/Lax/Secure cookies; CSRF origin; OAuth via navigation                                                                                                                                                                          | ✅             | [contracts/session-and-proxy.md](./contracts/session-and-proxy.md). The coordinator cache meets every condition of the v1.5.0 Session Storage exception (encrypted, hashed key, 30 s TTL, server-only reads). React escapes all rendered text, and no `dangerouslySetInnerHTML` is used.                                                                                                                                                                                                                                                                                                        |
| BIC      | Opaque tokens; rotate & persist; single-flight; refresh only where cookies are writable; 401→refresh once→retry once; logout always clears; three tiers; global 403; shared `ApiError` schema; preserve distinct messages; 429/503 friendly + cooldown; URL tokens stripped + exactly once | ✅             | Research R2–R6 and R10; contracts. Per constitution v1.4.0, only a refresh the backend rejects (`401`) clears the session; transient failures keep it (FR-013).                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Workflow | Atomic conventional commits; review gate per task                                                                                                                                                                                                                                          | ✅             | Enforced at `/speckit-tasks` and `/speckit-implement`. Test-first tasks use the v1.5.0 Red-task gate (tests fail for the expected reason; user approves the tests).                                                                                                                                                                                                                                                                                                                                                                                                                             |

**Gate result (pre-research)**: PASS. **Gate result (post-design)**: PASS. There are no
constitution violations; Complexity Tracking below justifies the added complexity.

## Project Structure

### Documentation (this feature)

```text
specs/001-auth-login-signup/
├── plan.md               # This file
├── research.md           # Phase 0: decisions R1–R16
├── data-model.md         # Phase 1: schemas, session states, coordinator records, UI state machines
├── quickstart.md         # Phase 1: env setup + 25 validation scenarios
├── contracts/
│   ├── backend-api.md        # consumed endpoints + status/message → AuthErrorCode → copy
│   ├── server-actions.md     # BFF actions exposed to the browser
│   └── session-and-proxy.md  # route tiers, proxy algorithm, refresh protocol, cookie writes
├── checklists/requirements.md
└── tasks.md              # Phase 2 (/speckit-tasks; not created here)
```

### Source Code (repository root)

```text
proxy.ts                                  # re-exports proxy + config from @/_app/proxy (Next 16 convention)

app/                                      # routing only (thin wrappers)
├── layout.tsx                            # fonts (Manrope, Hanken Grotesk), <Providers>, metadata
├── page.tsx                              # redirect("/map")
├── (auth)/                               # public + unverified auth screens share the split layout
│   ├── layout.tsx                        # renders <AuthShell> widget
│   ├── loading.tsx                       # renders <AuthShellLoading> widget
│   ├── login/page.tsx                    → @/_pages/login
│   ├── register/page.tsx                 → @/_pages/register
│   ├── verify-email/page.tsx             → @/_pages/verify-email
│   ├── forgot-password/page.tsx          → @/_pages/forgot-password
│   ├── reset-password/page.tsx           → @/_pages/reset-password
│   └── oauth/complete/page.tsx           → @/_pages/oauth-complete
├── session-unavailable/page.tsx          → @/_pages/session-unavailable (proxy rewrite target)
├── map/page.tsx                          → @/_pages/map (placeholder)
└── error.tsx                             # framework error boundary; renders <RouteErrorFallback>

public/
├── images/auth-hero.png                  # Figma asset (left panel)
└── icons/{google.png,help.svg}           # Figma assets

src/
├── _app/
│   ├── globals.css                       # @theme tokens remapped to Figma (research R11)
│   ├── providers/                        # QueryClientProvider ("use client") + index.ts
│   └── proxy/                            # proxy.ts (tier routing), route-tiers.ts, *.test.ts, index.ts
├── _pages/
│   ├── login/ register/ verify-email/ forgot-password/ reset-password/
│   ├── oauth-complete/ session-unavailable/ map/
│   │   └── ui/<Name>Page.tsx + index.ts  # compose feature components + headings/copy; parse searchParams
├── widgets/
│   └── auth-shell/                       # split-screen layout: hero panel, form column, footer, help icon
│       ├── ui/AuthShell.tsx, ui/AuthHero.tsx, ui/AuthFooter.tsx, ui/AuthShellLoading.tsx
│       └── index.ts
├── features/
│   └── auth/
│       ├── api/                          # "use server" actions + "use client" useMutation hooks
│       │   ├── login.action.ts  register.action.ts  verify-email.action.ts
│       │   ├── resend-verification.action.ts  forgot-password.action.ts
│       │   ├── reset-password.action.ts  exchange-oauth-token.action.ts  logout.action.ts
│       │   └── use-login.ts … (one hook per action)
│       ├── model/                        # form + URL-param Zod schemas, AuthErrorCode, AUTH_ERROR_COPY
│       ├── lib/                          # map-backend-error.ts (status+message → AuthErrorCode)
│       ├── config/                       # RESEND_COOLDOWN_MS, FORGOT_PASSWORD_CONFIRMATION, google-start-url
│       ├── ui/                           # LoginForm, RegisterForm, VerifyEmailForm, ResendCodeButton,
│       │                                 # ForgotPasswordForm, ResetPasswordForm, GoogleSignInButton,
│       │                                 # OAuthCompleteHandler, OAuthErrorCard, LogoutButton,
│       │                                 # AuthDivider, FormErrorAlert, PasswordField
│       └── index.ts
├── entities/
│   ├── user/
│   │   ├── model/current-user.schema.ts
│   │   ├── api/get-current-user.ts       # GET /auth/me (server-only; takes the access token)
│   │   └── index.ts                      # server-only: CurrentUserSchema, CurrentUser, getCurrentUser
│   └── session/
│       ├── model/token-pair.schema.ts, refresh-outcome.schema.ts
│       ├── config/cookies.ts             # names + attributes
│       ├── lib/refresh-coordinator.ts, crypto.ts (AES-GCM), session-cookies.ts (read/write/clear)
│       ├── api/authed-fetch.ts, refresh.ts, revoke.ts
│       └── index.ts                      # server-only public API; client code may only `import type`
└── shared/
    ├── ui/                               # button (moved), input, label, field, input-otp, alert, spinner, separator, route-error-fallback (custom)
    ├── api/                              # api-error.schema.ts, backend-fetch.ts (server-only), action-result.ts
    ├── lib/                              # utils.ts (cn), kv/{types,memory-store,upstash-store,get-kv-store,index}.ts
    └── config/                           # env.server.ts (server-only Zod), env.public.ts
```

**Structure Decision**: This is a single Next.js project. `app/` holds thin route wrappers, and `src/`
holds the FSD layers.

- Auth screens share the `(auth)` route group so the split-screen `AuthShell` widget mounts once.
- `features/auth` is one slice (FR-041) because its interactions share schemas, the error mapper,
  and copy.
- Session mechanics (cookies, refresh, `authedFetch`) live in `entities/session`, so later features
  can make authenticated calls without importing `features/auth`. That keeps same-layer imports out.
- The `KeyValueStore` port is domain-agnostic, so it lives in `shared/lib/kv`.

Import directions checked:

- `app/` → `_pages`, `widgets`, `_app`, `shared/ui` (glue only: each file renders one component)
- `_app/proxy` → `entities/session`, `entities/user`, `shared`
- `widgets/auth-shell` → `shared`
- `features/auth` → `entities/*`, `shared`
- `_pages/*` → `widgets`, `features`, `entities/session` (verify-email reads the code-sent cookie), `shared`
- `entities/user` → `shared` only; `entities/session` → `shared` only (no entity imports another)

There are no upward or sideways imports.

## Complexity Tracking

| Violation / added complexity                                                                                                                            | Why needed                                                                                                                                                                                                                                                                         | Simpler alternative rejected because                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Distributed refresh coordinator with a `KeyValueStore` port, two adapters (Upstash REST + memory), and AES-GCM-encrypted result cache (constitution IV) | On Vercel, concurrent and laggard requests from one browser can reach different instances. Replaying a rotated refresh token makes the backend revoke **all** sessions (FR-012, SC-006). The memory adapter keeps local dev and tests infra-free while running the same code path. | An in-process `Map<token, Promise>` is single-flight per instance only. A proactive refresh needs to decode tokens (forbidden). The `@upstash/redis` SDK is a new dependency for 4 commands. |
| Proxy calls `GET /auth/me` on every protected navigation                                                                                                | Tier routing (FR-006/FR-007) needs `emailVerified`, which may only come from `/auth/me` (FR-010, so no token decoding). It is also the point where a stale access token is refreshed before an RSC renders (an RSC cannot refresh).                                                | Reading tier state from a client-set cookie would be spoofable and stale. Checking per page in RSCs can't refresh or write cookies.                                                          |
