---
description: "Task list for 001-auth-login-signup"
---

# Tasks: Authentication — Login, Signup, Email Verification & Google Sign-In

**Input**: Design documents from `/specs/001-auth-login-signup/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: **REQUIRED.** Constitution VI (TDD) mandates Red → Green → Refactor. Every task that
adds behavior in `src/` is preceded by a test task. That test MUST be written, run, and seen to
**fail** before the implementation task starts. Test tasks use the constitution's **Red-task
gate** (v1.5.0): the new tests fail for the expected reason, every previously passing test still
passes, and the user approves the tests. Everything else uses the normal gate (compiles, tests
pass, user approves). Files in `app/` hold no behavior of their own (see
Conventions), so they have no unit tests. Run tests with `pnpm test:run` (Vitest + happy-dom). Test
files sit next to their source as `*.test.ts(x)`.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated
as its own increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: User story the task belongs to (US1–US6). Setup, Foundational, and Polish tasks have
  no story label.
- **Letter-suffixed IDs** (e.g. T018a) were inserted after the first draft so that earlier IDs stay
  stable. They run where they appear.

## Conventions used by every task

- **Paths**: Next.js routes live in `app/` (thin wrappers only). FSD layers live in `src/`. The path
  alias is `@/*` → `./src/*`.
- **Imports**: Imports flow downward only: `app/_app → _pages → widgets → features → entities → shared`.
  External consumers import a slice through its barrel only (`@/features/auth`, `@/entities/user`,
  `@/entities/session`). `@/entities/session` and `@/entities/user` are server-only: client modules
  may only `import type` from them. Entities never import each other. `shared` modules are imported by file path (`@/shared/ui/button`,
  `@/shared/api/backend-fetch`).
- **`server-only`**: Any module touching cookies, tokens, secrets, or the backend starts with
  `import "server-only"`. Server Actions start with `"use server"`. Client components start with
  `"use client"` and only when they need it.
- **`app/` is glue**: every file in `app/` only renders one component from `src/_pages`,
  `src/widgets`, or `src/shared/ui` (or calls `redirect`), passing `params` and `searchParams`
  through untouched. Parsing, copy, and UI live in `src/`, where they are tested. `app/` files are
  checked by `pnpm typecheck`, `pnpm build`, and the quickstart.
- **Component and page tests**: component tests mock the Server Action module (for example
  `../api/login.action`) and render with `renderWithQueryClient` (T005), so the real `use-*` hook
  and `useAuthMutation` run. Page tests in `src/_pages/` render the page (`await` it when it is
  async), mock feature components through the `@/features/auth` barrel (`vi.mock` with
  `importOriginal`), and assert what the page renders and the props it passes.
- **Types**: Types come from Zod via `z.infer<>`. No `any`. Exact backend messages and copy come from
  [contracts/backend-api.md](./contracts/backend-api.md).
- **Logging**: Never log tokens, codes, or passwords.
- **Figma source**: Design comes from file `xDvS7vVu6JmMLjG1J27idD`, node `1:2`. Read it with the Figma
  MCP `get_design_context` / `get_screenshot`, and invoke the `figma:figma-design-to-code` skill
  first. There is no signup frame: the signup screen reuses the login layout unchanged, with the
  copy from spec Assumptions ("Join Touch Grass" / "Create an account to start your journey.").

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Fix the existing FSD violation, add primitives, and set up tooling, design tokens, and
assets.

- [x] T001 Move `src/shared/components/ui/button.tsx` to `src/shared/ui/button.tsx` (keep its contents, `@/shared/lib/utils` import unchanged), delete the now-empty `src/shared/components/` directory, grep the repo for `shared/components` and fix any imports, and change the coverage exclude `"src/shared/components/ui/**"` to `"src/shared/ui/**"` in `vitest.config.ts` (research R12)
- [x] T002 Run `npx shadcn@latest add input label field input-otp alert spinner separator` from the repo root. Confirm each file lands flat in `src/shared/ui/` (per `components.json` aliases) and that `input-otp` was added to `package.json` (user-approved dependency). If a component is missing from the `base-nova` registry, use the closest one (`field` → `label` + RHF `Controller` markup) and record the substitution under R12 in `specs/001-auth-login-signup/research.md`
- [x] T003 [P] Enable typed routes for the `Route` type used by `ActionResult.redirectTo`. Set `typedRoutes: true` in `next.config.ts`, and change the `typecheck` script in `package.json` to `next typegen && tsc --noEmit` so route types exist before `tsc` runs
- [x] T004 [P] Make `import "server-only"` work under Vitest and `tsc` without installing a package (research R13). Add a throwaway `src/test/server-only-probe.test.ts` that imports `"server-only"`. If it fails to resolve, create the empty module `src/test/server-only.ts` (`export {}`) and add `resolve.alias: { "server-only": path.resolve(import.meta.dirname, "src/test/server-only.ts") }` to `vitest.config.ts`. If `tsc` cannot resolve the module, add `declare module "server-only"` in `src/shared/types/server-only.d.ts`. Delete the probe test afterwards. Also add `test.env: { NEXT_PUBLIC_API_URL: "http://api.test" }` to `vitest.config.ts`, because `env.server.ts` and `env.public.ts` parse the environment as soon as they are imported
- [x] T005 [P] Create test helpers (already excluded from coverage via `src/test/**`). _As built: `vi.mock` is only hoisted in the test file itself, so instead of a `mockNextHeaders()` function each test writes `vi.mock("next/headers", () => import("@/test/next-headers.mock"))` and calls `resetNextHeaders()` in `beforeEach`; `mockFetch` routes also accept a sequence of handlers, `json(status, body)` builds responses, and `unstubGlobals: true` removes the fetch stub after each test. Tests import `describe`/`it`/`expect`/`vi` from `"vitest"` explicitly so `tsc` sees them._
  - `src/test/next-headers.mock.ts`: an in-memory cookie jar implementing the `cookies()` API (`get`, `getAll`, `has`, `set(name, value, options)`, `delete`) that records the options of every `set`, plus a `headers()` stub with a settable `x-forwarded-for`, and a `mockNextHeaders()` helper that wires both through `vi.mock("next/headers")`
  - `src/test/fetch.mock.ts`: a `mockFetch(routes)` helper that stubs `globalThis.fetch` with a `"METHOD /path"` → `Response | (req) => Response | Error` table, records every call (method, URL, headers, parsed JSON body), and exposes `calls("POST /auth/refresh")`
  - `src/test/render-with-query.tsx`: `renderWithQueryClient(ui)` renders inside a fresh `QueryClientProvider` (mutations `retry: 0`) and returns Testing Library's result
- [x] T006 [P] Download the Figma assets from file `xDvS7vVu6JmMLjG1J27idD` node `1:2` through the Figma MCP (`download_assets`): the left hero image → `public/images/auth-hero.jpg`, the Google logo → `public/icons/google.png`, the help icon → `public/icons/help.svg`. Do **not** download the GitHub or Discord assets (FR-026)
- [x] T007 [P] Remap the design tokens in `src/_app/globals.css` per research R11:
  - set `--background: #faf9f7`, `--foreground: #1a1c1b`, `--muted-foreground: #424844`, `--primary: #1a3026`, `--primary-foreground: #ffffff`, `--border: #c2c8c3`, `--input: #888c88`, `--ring: #1a3026`, and `--radius: 0.5rem` in `:root`
  - add `--input-background: #f4f3f1`, `--link: #051b12`, `--placeholder: #646b78`, `--hero-fallback: #e9e8e6`, and map them in `@theme inline` as `--color-input-background`, `--color-link`, `--color-placeholder`, `--color-hero-fallback`
  - map `--font-sans: var(--font-hanken-grotesk)` and `--font-heading: var(--font-manrope)` in `@theme inline`
  - `--input`, `--ring`, and `--placeholder` deliberately differ from Figma so they pass WCAG AA (spec Assumptions: Figma deviations). `--border` is for decorative lines only; inputs and OTP slots use `border-input`
- [x] T008 Replace Geist in `app/layout.tsx` (depends on T007). Load `Manrope` (weights 600, 700, `variable: "--font-manrope"`) and `Hanken_Grotesk` (weights 400, 600, `variable: "--font-hanken-grotesk"`) from `next/font/google`, apply both variables to `<html>`, add `font-sans bg-background text-foreground` to `<body>`, and set `metadata` to `{ title: "Touch Grass", description: "Touch Grass" }`
- [ ] T008a **Manual (project owner)**: provision Upstash Redis for the Vercel project through the Vercel Marketplace for both Preview and Production, and set `SESSION_CACHE_KEY` (`openssl rand -base64 32`) in both environments (research R2, R14). Do it before the first deploy that includes US1: a Vercel deployment without these variables fails on its first request (T010). Local work and CI builds don't need them

**Checkpoint**: `pnpm typecheck`, `pnpm lint`, and `pnpm test:run` pass. Primitives live in `src/shared/ui/`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the BFF core: env, backend client, KV store, session entity with the
single-flight refresh, error model, client mutation wrapper, proxy tier routing, auth shell, and
the placeholder routes. Every user story depends on this phase.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Shared: env, error schema, backend client

- [x] T009 [P] Write failing tests in `src/shared/config/env.server.test.ts` for `ServerEnvSchema` (call `ServerEnvSchema.parse` with hand-built objects):
  - `NEXT_PUBLIC_API_URL` must be a URL
  - `SESSION_COOKIE_MAX_AGE` is coerced to an int and defaults to `2592000`
  - on a Vercel deployment (`VERCEL: "1"` and `NEXT_PHASE` is not `"phase-production-build"`), parsing fails if `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, or `SESSION_CACHE_KEY` is missing
  - during `next build` (`NEXT_PHASE: "phase-production-build"`) and off Vercel, the Upstash vars and key are optional, even with `NODE_ENV: "production"`
  - setting only one of `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` fails
  - `SESSION_CACHE_KEY`, when present, must base64-decode to exactly 32 bytes

  Also write failing tests in `src/shared/config/env.public.test.ts` for `PublicEnvSchema` (URL required)

- [x] T010 Implement `src/shared/config/env.server.ts` (`import "server-only"`; export `ServerEnvSchema`, which reads `VERCEL` and `NEXT_PHASE` and applies the T009 rules in a `superRefine`, and `serverEnv = ServerEnvSchema.parse(process.env)`, so a misconfigured Vercel deployment fails on its first request while `next build` and local runs need no secrets) and `src/shared/config/env.public.ts` (export `PublicEnvSchema` and `publicEnv = PublicEnvSchema.parse({ NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL })`; the literal reference lets Next inline it). Variables per research R14
- [x] T011 [P] Write failing tests in `src/shared/api/api-error.schema.test.ts`:
  - `ApiErrorSchema` accepts a `message` that is a `string` or a `string[]`
  - it rejects a `statusCode` outside 400–599
  - `parseApiError(status, body)` returns `{ statusCode: status, message: "", error: "Unknown" }` for an unparseable body and never throws
- [x] T012 Implement `src/shared/api/api-error.schema.ts` (`ApiErrorSchema`, `ApiError`, `parseApiError`), and `src/shared/api/action-result.ts` with a generic, domain-agnostic `ActionResult<TSuccess extends object = { redirectTo?: Route }, TError extends string = string>` = `({ ok: true } & TSuccess) | { ok: false; error: TError; fieldErrors?: Partial<Record<string, string>> }` (data-model §4; `Route` from `next`)
- [x] T013 Write failing tests in `src/shared/api/backend-fetch.test.ts` using T005 helpers. Requests:
  - the URL is `serverEnv.NEXT_PUBLIC_API_URL + path`
  - a JSON body is sent with `content-type: application/json`
  - an optional `accessToken` becomes `Authorization: Bearer …`
  - the first hop of the incoming `x-forwarded-for` (from `headers()`) is forwarded as `X-Forwarded-For`
  - `AbortSignal.timeout(8000)` is passed

  Results (it never throws):
  - `2xx` with a schema → `{ ok: true, status, data }`
  - `204` with no schema → `{ ok: true, status, data: undefined }`
  - a `2xx` that fails the schema → `{ ok: false, kind: "invalid_response", status }`
  - non-`2xx` → `{ ok: false, kind: "http", status, error: ApiError }`
  - a network error or abort → `{ ok: false, kind: "network" }`

- [x] T014 Implement `src/shared/api/backend-fetch.ts` (`import "server-only"`). Export `backendFetch<T>(path, { method, body?, accessToken?, schema? })` returning `BackendResult<T>` (the discriminated union from T013), with errors parsed via `parseApiError`. Add a scrubbed `console.error` (method, path, status only) for network and `5xx`

### Shared: key-value store port (refresh coordinator backing)

- [x] T015 [P] Write failing tests in `src/shared/lib/kv/memory-store.test.ts`: `setNx` returns `true` once and then `false` while the key is live; keys expire after `ttlMs` (fake timers); `set` overwrites; `del` removes; the store is shared through a `globalThis` key across module re-imports (`vi.resetModules`)
- [x] T016 [P] Write failing tests in `src/shared/lib/kv/upstash-store.test.ts` with mocked `fetch`:
  - each op is a `POST` to `UPSTASH_REDIS_REST_URL` with `Authorization: Bearer <token>` and a JSON command array (`["GET", k]`, `["SET", k, v, "NX", "PX", ttl]`, `["SET", k, v, "PX", ttl]`, `["DEL", k]`)
  - responses are parsed with `UpstashResponseSchema` (`{ result: unknown } | { error: string }`)
  - `setNx` → `true` on `"OK"`, `false` on `null`
  - an `{ error }`, a non-2xx, or a network failure throws `KvError`
- [x] T017 Implement `src/shared/lib/kv/types.ts` (`KeyValueStore` interface: `get`, `setNx`, `set`, `del`, all async; `KvError` class) and `src/shared/lib/kv/memory-store.ts` (`createMemoryStore()` backed by a `globalThis`-scoped `Map` with TTLs)
- [x] T018 Implement `src/shared/lib/kv/upstash-store.ts` (`import "server-only"`; `createUpstashStore({ url, token })` using plain `fetch`, no SDK; research R2)
- [x] T018a [P] Write failing tests in `src/shared/lib/kv/get-kv-store.test.ts` (mock `@/shared/config/env.server`, `./upstash-store`, and `./memory-store`, and check which factory is called): `getKvStore()` returns the Upstash store when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set and the memory store otherwise, and returns the same instance on repeated calls (memoized on `globalThis`; clear the key and call `vi.resetModules()` between tests)
- [x] T019 Implement `src/shared/lib/kv/get-kv-store.ts` (`import "server-only"`): `getKvStore()` returns the Upstash store when `serverEnv.UPSTASH_REDIS_REST_URL` and the token are set and otherwise the memory store, memoized on `globalThis`. Then create the barrel `src/shared/lib/kv/index.ts` (`import "server-only"`), which only re-exports `getKvStore`, `KvError`, and the `KeyValueStore` type (barrels are excluded from coverage, so they hold no logic)

### Entities: user

- [x] T020 [P] Write failing tests in `src/entities/user/model/current-user.schema.test.ts`: `CurrentUserSchema` accepts `{ id: uuid, email, emailVerified: boolean }` and rejects a non-uuid `id`, an invalid `email`, or a missing `emailVerified`
- [x] T021 Implement `src/entities/user/model/current-user.schema.ts` (`CurrentUserSchema`, `CurrentUser`) and the barrel `src/entities/user/index.ts`
- [x] T021a [P] Write failing tests in `src/entities/user/api/get-current-user.test.ts` (T005 helpers): `getCurrentUser(accessToken)` sends `GET /auth/me` with `Authorization: Bearer <accessToken>` and returns `{ ok: true, user }`; `{ ok: false, reason: "unauthorized" }` on `401`; `{ ok: false, reason: "transient" }` on network, `5xx`, `429`, or a response that fails `CurrentUserSchema`
- [x] T021b Implement `src/entities/user/api/get-current-user.ts` (`import "server-only"`; built on `backendFetch` with `schema: CurrentUserSchema`; it takes the access token as an argument, so it needs nothing from `entities/session`). Add `import "server-only"` to `src/entities/user/index.ts` and export `getCurrentUser` from it (constitution II: `entities/session` must not import `entities/user`)

### Entities: session (cookies, crypto, refresh coordinator, authed fetch)

- [x] T022 [P] Write failing tests in `src/entities/session/model/session-schemas.test.ts`:
  - `TokenPairSchema` requires non-empty `accessToken` and `refreshToken` strings
  - `RefreshOutcomeRecordSchema` is a discriminated union on `kind` (`ok` with `pair`, or `revoked`)
  - `RefreshOutcome` additionally allows `{ kind: "transient" }`
- [x] T023 Implement `src/entities/session/model/token-pair.schema.ts` and `src/entities/session/model/refresh-outcome.schema.ts`, and start the barrel `src/entities/session/index.ts` with the schemas and their types (T034 completes it)
- [x] T024 [P] Write failing tests in `src/entities/session/lib/session-cookies.test.ts`. Each function takes a cookie-store argument; test with the T005 jar:
  - `readSession(store)` returns `{ accessToken, refreshToken }` only when both `tg_at` and `tg_rt` exist, and `null` otherwise
  - `writeTokenPair(store, pair)` sets both with `httpOnly: true, sameSite: "lax", path: "/", maxAge: serverEnv.SESSION_COOKIE_MAX_AGE`, and `secure` only in production
  - `clearSession(store)` deletes `tg_at`, `tg_rt`, and `tg_code_sent_at`
  - `writeCodeSentAt(store, nowMs)` sets `tg_code_sent_at` with `maxAge: 900`
  - `readCodeSentAt(store)` returns a number or `null`, and `null` for a non-numeric value
- [x] T025 Implement `src/entities/session/config/cookies.ts` (`SESSION_COOKIES = { access: "tg_at", refresh: "tg_rt", codeSentAt: "tg_code_sent_at" } as const` and `sessionCookieOptions(maxAge)`) and `src/entities/session/lib/session-cookies.ts` (`import "server-only"`). The store parameter type must be satisfied by `await cookies()` and `NextResponse.cookies`. _As built: `NextRequest.cookies.set` accepts no options, so it cannot satisfy `CookieStore`; T049 wraps it in a small adapter (`get`/`set(name, value)`/`delete`)_
- [x] T026 [P] Write failing tests in `src/entities/session/lib/crypto.test.ts`: `encryptJson` → `decryptJson` round-trips; two encryptions of the same value differ (random 12-byte IV); a tampered ciphertext or wrong key makes `decryptJson` return `null` (it never throws)
- [x] T027 Implement `src/entities/session/lib/crypto.ts` (`import "server-only"`). Use AES-256-GCM via `globalThis.crypto.subtle`, and output base64 of `iv ‖ ciphertext`. The key is imported from `serverEnv.SESSION_CACHE_KEY`. If the key is absent (allowed only off Vercel: local dev, tests, local `next start`; see T010), generate a random key once per process and memoize it on `globalThis`
- [x] T028 [P] Write failing tests in `src/entities/session/api/session-api.test.ts`:
  - `callRefresh(rt)`: `POST /auth/refresh { refreshToken }`. A `200` returns `{ kind: "ok", pair }`, any `401` returns `{ kind: "revoked" }`, and `429`, `5xx`, network, or an invalid response return `{ kind: "transient" }`
  - `revokeSession(rt)`: `POST /auth/logout { refreshToken }` that resolves `void` whatever the outcome, and never throws
- [x] T029 Implement `src/entities/session/api/refresh.ts` and `src/entities/session/api/revoke.ts` (each `import "server-only"`, built on `backendFetch`)
- [x] T030 Write failing tests in `src/entities/session/lib/refresh-coordinator.test.ts`. Use the memory store, mocked `fetch`, and fake timers; cover every case in research R2 and contracts/session-and-proxy.md:
  - the winner on `200` stores the encrypted `rt:result:{sha256hex(rt)}` with a 30 s TTL and returns `ok`
  - the winner on `401` caches `revoked`
  - a transient winner deletes `rt:lock:*`, caches nothing, and returns `transient`
  - 5 concurrent `refreshSession(sameRt)` calls produce **exactly one** `POST /auth/refresh` and all get the same pair (SC-006)
  - a laggard call after rotation gets the cached pair with no backend call
  - a loser polls every 100 ms and gets the result
  - if the lock vanishes without a result, the loser retries acquiring the lock once
  - a loser times out after 4 s → `transient`
  - a `KvError` from the store → `transient`
  - no stored key or value contains the plaintext refresh token
- [x] T031 Implement `src/entities/session/lib/refresh-coordinator.ts` (`import "server-only"`). Export `refreshSession(oldRt, deps = { store: getKvStore(), now, sleep })` returning `RefreshOutcome`. Use a lock TTL of 10 000 ms, a result TTL of 30 000 ms, a 100 ms poll for up to 4 000 ms, and hash keys with `crypto.subtle.digest("SHA-256")`
- [x] T032 Write failing tests in `src/entities/session/api/authed-fetch.test.ts` (T005 helpers):
  - attaches `Bearer tg_at`
  - on `401` with `isSessionFailure(error) === true` (the default), calls `refreshSession` once, writes the new pair to `cookies()`, and retries **once** with the new token
  - a second `401` after the retry is classified again with `isSessionFailure`: `true` → clear the cookies and return `{ ok: false, kind: "session_expired" }`; `false` (a business `401`) → return that `401` result unchanged, with the **new** pair kept in the cookies
  - refresh `revoked` → clear the cookies and return `session_expired`
  - refresh `transient` → return `{ ok: false, kind: "network" }` and keep the cookies
  - `isSessionFailure` returning `false` → return the `401` result unchanged with no refresh call
  - `403` with `message === "Email not verified"` → `{ ok: false, kind: "email_not_verified" }`
  - no session cookies → `session_expired` with no backend call
- [x] T033 Implement `src/entities/session/api/authed-fetch.ts` (`import "server-only"`). Export `authedFetch<T>(path, { method, body?, schema?, isSessionFailure? })` returning `BackendResult<T> | { ok: false; kind: "session_expired" | "email_not_verified" }`, using `await cookies()` from `next/headers` (research R4)
- [x] T034 Complete the barrel `src/entities/session/index.ts`: add `import "server-only"` at the top and re-export `readSession`, `writeTokenPair`, `clearSession`, `writeCodeSentAt`, `readCodeSentAt`, `SESSION_COOKIES`, `refreshSession`, `authedFetch`, and `revokeSession` alongside the schemas (`getCurrentUser` is exported by `@/entities/user`, T021b). `callRefresh` stays internal, because only the coordinator uses it. Every consumer is server-side; client modules may only `import type` from this barrel

### Feature auth: shared error model, field schemas, client mutation wrapper, form atoms

- [x] T035 [P] Write failing tests in `src/features/auth/model/auth-error.test.ts`: `AuthErrorCodeSchema` contains exactly the 25 codes in data-model §4; `AUTH_ERROR_COPY` has a non-empty string for every code (exhaustive `satisfies Record<AuthErrorCode, string>`); copy matches the "User-facing copy" column of contracts/backend-api.md
- [x] T036 Implement `src/features/auth/model/auth-error.ts`: `AuthErrorCodeSchema` (`z.enum`), `AuthErrorCode`, `AUTH_ERROR_COPY`, and `AuthActionResult<T extends object = { redirectTo?: Route }> = ActionResult<T, AuthErrorCode>`
- [x] T037 [P] Write failing tests in `src/features/auth/model/fields.test.ts`:
  - `EmailSchema` trims, is required, and rejects malformed addresses
  - `NewPasswordSchema` rejects 7 and 73 characters and accepts 8 and 72
  - `NewPasswordSchema` accepts `"aaaaaaaa"` (no composition rules, FR-032)
  - `withPasswordConfirmation(schema)` adds a refine that puts the mismatch error on `confirmPassword`
- [x] T038 Implement `src/features/auth/model/fields.ts` (`EmailSchema`, `NewPasswordSchema`, `withPasswordConfirmation`) with user-facing messages ("Enter your email", "Enter a valid email address", "Password must be 8–72 characters", "Passwords don't match")
- [x] T039 Write failing tests in `src/features/auth/lib/map-backend-error.test.ts` with **one case per row** of the error-mapping table in contracts/backend-api.md. Call `mapBackendError(endpoint, result)` where `endpoint ∈ "login" | "signup" | "verify-email" | "resend-verification" | "forgot-password" | "reset-password" | "oauth-exchange"`. Include:
  - exact-message matches for the verify-email and reset-password `401`s
  - a fallthrough for unmatched messages
  - `400` → `VALIDATION`; `network` → `NETWORK_ERROR`; `invalid_response` → `UNEXPECTED`; other `5xx` → `SERVER_ERROR` (except resend `503` → `EMAIL_SEND_FAILED`)
  - login and verify-email `429` → `TOO_MANY_ATTEMPTS`; any other `429` without a row of its own (for example signup or reset-password) → `RATE_LIMITED`
  - `session_expired` → `SESSION_EXPIRED`; `email_not_verified` → `EMAIL_NOT_VERIFIED`
  - `isVerifyCodeError(message)` is `true` only for the four verification-code messages
- [x] T040 Implement `src/features/auth/lib/map-backend-error.ts` (`mapBackendError`, `isVerifyCodeError`, and the backend message constants copied verbatim from `docs/backend-readme.md`)
- [x] T041 [P] Write failing tests in `src/features/auth/api/use-auth-mutation.test.tsx`. Mock `next/navigation`'s `useRouter` and wrap in a `QueryClientProvider`:
  - `{ ok: true, redirectTo }` → `router.replace(redirectTo)`
  - `SESSION_EXPIRED` → `router.replace("/login?reason=session_expired")`
  - `EMAIL_NOT_VERIFIED` → `router.replace("/verify-email")` (global 403 handler, FR-020)
  - any other failure is returned to the caller through `onFailure` without navigating
  - an action that **rejects** (offline, deployment skew "Failed to find Server Action", timeout) is logged with `console.error` and reaches `onFailure` as `{ ok: false, error: "NETWORK_ERROR" }`, with no navigation and the form usable again (constitution VIII: no silent failure)
  - the action is called exactly once per `mutate` (no retry)
- [x] T042 Implement `src/features/auth/api/use-auth-mutation.ts` (`"use client"`). Export `useAuthMutation(action, { onFailure?, onSuccess? })` wrapping TanStack `useMutation({ mutationFn: action, retry: 0 })` with the routing from T041 (research R8). The `mutationFn` catches a rejected action call, logs it, and resolves to `{ ok: false, error: "NETWORK_ERROR" }`
- [x] T043 [P] Write failing tests in `src/features/auth/ui/form-atoms.test.tsx`:
  - `FormErrorAlert` renders `AUTH_ERROR_COPY[code]` inside `role="alert"` and renders nothing without a code
  - `EmailField` and `PasswordField` render a visible `<label>` tied to the input, set `aria-invalid` and `aria-describedby` → the error text when an error is passed, and forward `autoComplete` (`email` / `current-password` / `new-password`)
- [x] T044 Implement `src/features/auth/ui/FormErrorAlert.tsx` (shadcn `Alert`, destructive variant), `src/features/auth/ui/EmailField.tsx`, and `src/features/auth/ui/PasswordField.tsx`. Build them from shadcn `field`/`label`/`input` in `@/shared/ui/*`, styled per Figma (labels Hanken SemiBold 12px, tracking 1.2px, uppercase; inputs `bg-input-background rounded-sm`, placeholder `text-placeholder`). Create the barrel `src/features/auth/index.ts`, exporting `AUTH_ERROR_COPY`, `type AuthErrorCode`, and `FormErrorAlert`. _As built: labels are mixed case as rendered in Figma `1:2` (its layers carry no uppercase transform); both fields share an internal `AuthTextField` with a `labelAside` slot for "Forgot password?"_

### App layer: providers, route tiers, proxy

- [x] T044a [P] Write failing tests in `src/_app/providers/QueryProvider.test.tsx`: `Providers` renders its children, and a child calling `useQueryClient()` sees `mutations.retry === 0` in the default options and gets the same client after a re-render
- [x] T045 Create `src/_app/providers/QueryProvider.tsx` (`"use client"`; a `QueryClient` created in `useState`, `defaultOptions.mutations.retry: 0`) and `src/_app/providers/index.ts` (exports `Providers`). Wrap `{children}` in `app/layout.tsx` with `<Providers>`
- [x] T046 [P] Write failing tests in `src/_app/proxy/route-tiers.test.ts`: `getRouteTier(pathname)` returns `public` for `/login`, `/register`, `/forgot-password`, `/reset-password`, `/oauth/complete`, and `/session-unavailable`; `unverified` for `/verify-email`; `verified` for `/map`, `/`, and any unknown path; trailing slashes are normalised
- [x] T047 Implement `src/_app/proxy/route-tiers.ts` (`ROUTE_TIERS: Record<string, "public" | "unverified">` listing only the looser routes, and `getRouteTier`, which defaults to `"verified"`; data-model §6)
- [x] T048 Write failing tests in `src/_app/proxy/proxy.test.ts`. Build requests with `new NextRequest(url, { headers: { cookie } })` and use mocked `fetch` plus the memory KV. Cover every branch of the proxy algorithm in contracts/session-and-proxy.md:
  - a non-GET request, or one with a `Next-Action` header, passes through
  - public non-auth routes pass through with no backend call
  - `/login` or `/register` with a session: verified → redirect `/map`; unverified → redirect `/verify-email`; revoked → cookies deleted and pass through; transient → pass through
  - a protected route with no cookies → redirect `/login`
  - verified on `/map` → pass through
  - unverified on `/map` → redirect `/verify-email`
  - verified on `/verify-email` → redirect `/map`
  - `/auth/me` `401` → refresh → `/auth/me` retried once with the new token. The response carries `Set-Cookie` for the new `tg_at`/`tg_rt`, **and** the forwarded request `cookie` header contains the new pair
  - revoked → redirect `/login?reason=session_expired` with all `tg_*` cookies deleted
  - transient → rewrite to `/session-unavailable` with the URL and cookies unchanged
- [x] T049 Implement `src/_app/proxy/proxy.ts` (the `proxy(request)` handler and an internal `resolveMe` using `getCurrentUser` from `@/entities/user` and `refreshSession` from `@/entities/session`). When a refresh happens, write the pair with `writeTokenPair(forwardedCookies(request), pair)` (an adapter over `request.cookies`, see T025), then return `NextResponse.next({ request: { headers: request.headers } })`, redirect, or rewrite, and also `writeTokenPair(response.cookies, pair)`. Create `src/_app/proxy/index.ts` (exports `proxy`) and the root `proxy.ts`, which re-exports `proxy` from `@/_app/proxy` and declares `export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|images/|icons/).*)"] }` **inline** (Next statically analyses `config`)

### Widgets, routes, placeholder pages

- [x] T050 [P] Write failing tests in `src/widgets/auth-shell/ui/AuthShell.test.tsx`: renders `children` in the form column; the hero `<img>` has `alt=""` and its panel has the classes `hidden lg:block`; the help icon is `aria-hidden`; the footer text is not rendered as links. Also write failing tests in `src/widgets/auth-shell/ui/AuthShellLoading.test.tsx`: it renders a spinner with an accessible name (`role="status"`) inside a fixed-height box
- [x] T051 Implement `src/widgets/auth-shell/ui/AuthHero.tsx`, `src/widgets/auth-shell/ui/AuthFooter.tsx`, `src/widgets/auth-shell/ui/AuthShell.tsx`, `src/widgets/auth-shell/ui/AuthShellLoading.tsx` (shadcn `Spinner` centred in a fixed-height box, so no layout shift occurs), and `src/widgets/auth-shell/index.ts` (exports `AuthShell` and `AuthShellLoading`) per research R11 and Figma `1:2`:
  - two equal columns at `lg`; hero via `next/image` with `priority` and `fill` inside a fixed box with `bg-hero-fallback` (no CLS)
  - hero title Manrope SemiBold 80/100, white, `[text-shadow:0_2px_4px_#0003]`
  - form column centred `max-w-[440px]`, `p-20` at `lg`, `px-4` on mobile
  - footer pinned to the bottom of the right panel
  - static help icon from `/icons/help.svg`
- [x] T052 Create `app/(auth)/layout.tsx` (renders `<AuthShell>{children}</AuthShell>` from `@/widgets/auth-shell`) and `app/(auth)/loading.tsx` (renders `<AuthShellLoading />` from `@/widgets/auth-shell`)
- [x] T052a [P] Write failing tests in `src/_pages/session-unavailable/ui/SessionUnavailablePage.test.tsx` and `src/_pages/session-unavailable/ui/RetryButton.test.tsx`: the page renders a heading and the `NETWORK_ERROR` copy from `AUTH_ERROR_COPY`; the Retry button calls `window.location.reload()` once per click (spy on it)
- [x] T053 Create `src/_pages/session-unavailable/ui/SessionUnavailablePage.tsx` (RSC: heading plus the `NETWORK_ERROR` copy from `AUTH_ERROR_COPY` via `@/features/auth`), `src/_pages/session-unavailable/ui/RetryButton.tsx` (`"use client"`; `window.location.reload()`), `src/_pages/session-unavailable/index.ts`, and the thin route `app/session-unavailable/page.tsx`
- [x] T053a [P] Write failing tests in `src/_pages/map/ui/MapPage.test.tsx` (the "Map coming soon" heading; no backend call) and `src/shared/ui/route-error-fallback.test.tsx` (`RouteErrorFallback` shows a generic message in `role="alert"`, and its Retry button calls the `reset` prop)
- [x] T054 Create the placeholder `src/_pages/map/ui/MapPage.tsx` (RSC, heading "Map coming soon", no backend call), `src/_pages/map/index.ts`, and `app/map/page.tsx`. Replace the boilerplate `app/page.tsx` with `redirect("/map")` from `next/navigation`. Implement `src/shared/ui/route-error-fallback.tsx` (`"use client"`; `RouteErrorFallback({ reset })` with a generic message and a Retry button) and add `app/error.tsx` (`"use client"` framework boundary that renders `<RouteErrorFallback reset={reset} />`)

**Checkpoint**: `pnpm test:run` is green. In `pnpm dev`, `/map` with no cookies redirects to
`/login` (the page may 404 until US1). Stopping the backend with fake cookies rewrites `/map` to the
session-unavailable page.

---

## Phase 3: User Story 1 — Email/Password Login (Priority: P1) 🎯 MVP

**Goal**: A verified user logs in with email and password. Tokens go into HttpOnly cookies, and the
user lands on `/map`; an unverified user lands on `/verify-email`. The user can log out.

**Independent Test**: With a verified backend account, submit valid credentials on `/login`. You
reach `/map`, `tg_at`/`tg_rt` are HttpOnly, and `document.cookie` has no `tg_`. Wrong credentials
show "Invalid email or password". Log out returns you to `/login` with the cookies gone (quickstart
scenarios 9, 10, 12, 14, 24).

### Tests for User Story 1 (write first; they MUST fail) ⚠️

- [x] T055 [P] [US1] Write failing tests in `src/features/auth/model/login.schema.test.ts`: `LoginSchema` requires a trimmed valid email and a non-empty password, with **no** length rule on password (data-model §3)
- [x] T056 [P] [US1] Write failing tests in `src/features/auth/api/login.action.test.ts` (mock `next/headers` + `fetch`):
  - invalid input → `{ ok: false, error: "VALIDATION", fieldErrors }` and no fetch
  - `200` → `tg_at`/`tg_rt` set, then `GET /auth/me`: `emailVerified: true` → `redirectTo: "/map"`; `false` → `"/verify-email"`; if `/auth/me` fails → `redirectTo: "/map"` (proxy re-tiers)
  - `401` → `INVALID_CREDENTIALS` with no cookies; `429` → `TOO_MANY_ATTEMPTS`; network → `NETWORK_ERROR`; a thrown error → `UNEXPECTED`
  - `JSON.stringify(result)` never contains either token
- [ ] T057 [P] [US1] Write failing tests in `src/features/auth/api/logout.action.test.ts`: sends `POST /auth/logout { refreshToken }` with the cookie value; deletes `tg_at`, `tg_rt`, and `tg_code_sent_at` even when the backend returns `500` or the network fails; calls `redirect("/login")` (mock `next/navigation`); with no session it skips the backend call and still clears and redirects
- [ ] T058 [P] [US1] Write failing tests in `src/features/auth/ui/LoginForm.test.tsx` (mock `../api/login.action` and `next/navigation`; render with `renderWithQueryClient`):
  - an empty submit shows errors on both fields and does not call the action
  - an invalid email shows an error on blur
  - a valid submit calls the action once with `{ email, password }`
  - while pending, the submit button is disabled and shows a spinner
  - `INVALID_CREDENTIALS` renders "Invalid email or password" in `role="alert"`
  - `TOO_MANY_ATTEMPTS` renders "Too many attempts, please wait a moment"
  - `NETWORK_ERROR` leaves the form enabled for retry
- [ ] T059 [P] [US1] Write failing tests in `src/features/auth/ui/LogoutButton.test.tsx`: renders a `<form>` whose action is the `logout` Server Action and a "Log out" submit button that is disabled while pending (`useFormStatus`)
- [ ] T060 [P] [US1] Write failing tests in `src/_pages/login/ui/LoginPage.test.tsx` (render `await LoginPage({ searchParams: Promise.resolve(…) })`; mock `LoginForm` through the barrel): `reason: "session_expired"` renders the `SESSION_EXPIRED` notice ("Your session has ended. Please log in again."); an unknown `reason`, an array value, or none renders no notice; it renders `LoginForm`, the heading "Welcome to Touch Grass", and the subtitle "Sign in to continue your journey." (Figma `1:2`)
- [ ] T060a [P] [US1] Extend `src/_pages/map/ui/MapPage.test.tsx`: the page renders a "Log out" button (mock `LogoutButton` through the `@/features/auth` barrel)

### Implementation for User Story 1

- [ ] T061 [P] [US1] Implement `src/features/auth/model/login.schema.ts` (`LoginSchema`, `LoginInput`) using `EmailSchema` from `./fields`
- [ ] T062 [US1] Implement `src/features/auth/api/login.action.ts` (`"use server"`). Follow the contracts/server-actions.md `login` row: re-parse with `LoginSchema` → `backendFetch("/auth/login", { schema: TokenPairSchema })` → `writeTokenPair(await cookies(), pair)` → `getCurrentUser(pair.accessToken)` → `redirectTo`. Map errors with `mapBackendError("login", …)` and wrap everything in try/catch → `UNEXPECTED`
- [ ] T063 [P] [US1] Implement `src/features/auth/api/logout.action.ts` (`"use server"`): `readSession` → `revokeSession(refreshToken)` if present → `clearSession` → `redirect("/login")` (FR-015)
- [ ] T064 [US1] Implement `src/features/auth/api/use-login.ts` (`"use client"`; `useAuthMutation(login)`)
- [ ] T065 [US1] Implement `src/features/auth/ui/LoginForm.tsx` (`"use client"`):
  - RHF + `zodResolver(LoginSchema)`, `mode: "onTouched"`
  - `EmailField` and `PasswordField` (`autoComplete="current-password"`), `FormErrorAlert`
  - map `fieldErrors` → `setError`
  - submit `Button` per Figma: full width, `rounded-lg`, Hanken SemiBold 18/28.8, label "Log In", `Spinner` + `disabled` while pending
- [ ] T066 [P] [US1] Implement `src/features/auth/ui/LogoutButton.tsx` (`<form action={logout}>` plus a small `"use client"` submit button using `useFormStatus`)
- [ ] T067 [US1] Export `LoginForm`, `LogoutButton`, and `LoginSchema` from `src/features/auth/index.ts`
- [ ] T068 [US1] Implement `src/_pages/login/model/login-params.schema.ts` (`LoginParamsSchema = z.object({ reason: z.enum(["session_expired"]).optional().catch(undefined) })`), `src/_pages/login/ui/LoginPage.tsx` (async RSC that takes `searchParams`, awaits it, and parses it with `LoginParamsSchema`; Figma heading Manrope Bold 32/38.4, subtitle Hanken 16/24, optional session-expired notice, `<LoginForm />`), `src/_pages/login/index.ts`, and the thin route `app/(auth)/login/page.tsx` (renders `<LoginPage searchParams={searchParams} />`). Once `/login` exists, remove the `as Route` cast on `SESSION_EXPIRED_ROUTE` in `src/features/auth/api/use-auth-mutation.ts` (added in T042 because typed routes reject routes that do not exist yet)
- [ ] T069 [US1] Render `<LogoutButton />` from `@/features/auth` in `src/_pages/map/ui/MapPage.tsx`

**Checkpoint**: Quickstart scenarios 9, 10, 12, 14, and 24 pass. US1 is shippable on its own for
already-verified accounts.

---

## Phase 4: User Story 2 — New User Registration (Priority: P1)

**Goal**: A new user signs up with email and password (plus a client-side confirmation). The session
is established and the user lands on `/verify-email` with the resend cooldown already running.

**Independent Test**: Submit a new email with a valid password on `/register`. The browser lands on
`/verify-email` with `tg_at`, `tg_rt`, and `tg_code_sent_at` set as HttpOnly. A duplicate email shows
"already registered" on the email field (quickstart scenarios 1–3; the verify screen itself arrives
in US3).

### Tests for User Story 2 (write first; they MUST fail) ⚠️

- [ ] T070 [P] [US2] Write failing tests in `src/features/auth/model/register.schema.test.ts`: `RegisterSchema` covers required email, password, and confirm; password length 7/8/72/73; a mismatch error lands on `confirmPassword`
- [ ] T071 [P] [US2] Write failing tests in `src/features/auth/api/register.action.test.ts`:
  - the request body is exactly `{ email, password }` (no `confirmPassword`)
  - `201` → `tg_at`, `tg_rt`, and `tg_code_sent_at` (≈ now) set, and `{ ok: true, redirectTo: "/verify-email" }`
  - `409` → `EMAIL_TAKEN` with `fieldErrors.email`
  - `400` → `VALIDATION`; `429` → `RATE_LIMITED`; network → `NETWORK_ERROR`
  - the result never contains tokens
- [ ] T072 [P] [US2] Write failing tests in `src/features/auth/ui/RegisterForm.test.tsx` (mock `../api/register.action` and `next/navigation`; render with `renderWithQueryClient`):
  - an empty submit shows three field errors
  - a 7-char password shows the length message
  - a mismatched confirm shows "Passwords don't match"
  - `EMAIL_TAKEN` shows its copy on the email field
  - while pending the button is disabled with a spinner
  - a valid submit calls the action once with the form values
- [ ] T072a [P] [US2] Write failing tests in `src/_pages/register/ui/RegisterPage.test.tsx` (mock `RegisterForm` through the barrel): it renders the heading "Join Touch Grass", the subtitle "Create an account to start your journey." (spec Assumptions), and `RegisterForm`

### Implementation for User Story 2

- [ ] T073 [P] [US2] Implement `src/features/auth/model/register.schema.ts` (`RegisterSchema = withPasswordConfirmation(z.object({ email: EmailSchema, password: NewPasswordSchema, confirmPassword: z.string() }))`, `RegisterInput`)
- [ ] T074 [US2] Implement `src/features/auth/api/register.action.ts` (`"use server"`; contracts/server-actions.md `register` row; `writeTokenPair` + `writeCodeSentAt(store, Date.now())`; map with `mapBackendError("signup", …)`)
- [ ] T075 [US2] Implement `src/features/auth/api/use-register.ts` (`"use client"`; `useAuthMutation(register)`)
- [ ] T076 [US2] Implement `src/features/auth/ui/RegisterForm.tsx` (`"use client"`; mirrors `LoginForm`: `EmailField`, two `PasswordField`s with `autoComplete="new-password"`, submit label "Sign Up", `EMAIL_TAKEN` → `setError("email", …)`)
- [ ] T077 [US2] Export `RegisterForm` from `src/features/auth/index.ts`. Implement `src/_pages/register/ui/RegisterPage.tsx` (RSC; heading "Join Touch Grass" and subtitle "Create an account to start your journey." in the login page's typography and layout; `<RegisterForm />`), `src/_pages/register/index.ts`, and the thin route `app/(auth)/register/page.tsx`

**Checkpoint**: Quickstart scenarios 1–3 pass (the redirect target `/verify-email` renders once US3
lands).

---

## Phase 5: User Story 3 — Email Verification (OTP) (Priority: P1)

**Goal**: An unverified user enters the 6-digit code at `/verify-email`, gets verified with the same
access token, and lands on `/map`. They can resend a code with a 60-second cooldown, and every
code-failure state is distinct.

**Independent Test**: Sign up, then enter the code from the backend log. You reach `/map` with no
`/auth/refresh` or `/auth/login` in the backend log. A wrong code consumes exactly one attempt.
Resend enforces the cooldown (quickstart scenarios 4–8, 11).

### Tests for User Story 3 (write first; they MUST fail) ⚠️

- [ ] T078 [P] [US3] Write failing tests in `src/features/auth/model/verify-email.schema.test.ts`: `VerifyEmailSchema` accepts `"012345"` and keeps it a string (leading zero preserved); it rejects `"12345"`, `"1234567"`, `"12a456"`, and `""`
- [ ] T079 [P] [US3] Write failing tests in `src/features/auth/lib/cooldown.test.ts`: `getCooldownEndsAt(codeSentAtMs | null, nowMs)` returns `codeSentAt + 60_000` when that is in the future and `null` when it is absent or elapsed; `secondsRemaining(endsAt, now)` rounds up
- [ ] T080 [P] [US3] Write failing tests in `src/features/auth/api/verify-email.action.test.ts`:
  - `204` → `{ ok: true, redirectTo: "/map" }` with **zero** calls to `/auth/refresh`
  - each of the 4 code messages → its code (`CODE_INVALID`, `CODE_EXPIRED`, `CODE_NONE_ACTIVE`, `CODE_ATTEMPTS_EXHAUSTED`) with **exactly one** `POST /auth/verify-email` and no refresh (FR-014, SC-011)
  - a non-code `401` → refresh → retry once → `204` → success (FR-016: the guard rejected the first request before the code check, so the code is evaluated once)
  - a non-code `401` → refresh → retry → `401` "Invalid verification code" → `CODE_INVALID`, cookies hold the **new** pair (not cleared), exactly two `POST /auth/verify-email` and one `POST /auth/refresh`
  - a revoked refresh → `SESSION_EXPIRED` with cookies cleared
  - `429` → `TOO_MANY_ATTEMPTS`
  - an invalid code input → `VALIDATION` with no fetch
- [ ] T081 [P] [US3] Write failing tests in `src/features/auth/api/resend-verification.action.test.ts`:
  - `204` → `tg_code_sent_at` set and `{ ok: true, cooldownEndsAt }`
  - `429` with the cooldown message → `RESEND_COOLDOWN` plus `cooldownEndsAt`, cookie set
  - `429` other → `RATE_LIMITED` plus `cooldownEndsAt`, cookie set
  - `503` → `EMAIL_SEND_FAILED` plus `cooldownEndsAt`, cookie set
  - session revoked → `SESSION_EXPIRED`
  - `403` "Email not verified" never occurs here (AllowUnverified), but a `403` maps through `authedFetch` to `EMAIL_NOT_VERIFIED` without crashing
- [ ] T082 [P] [US3] Write failing tests in `src/features/auth/ui/VerifyEmailForm.test.tsx` (mock `../api/verify-email.action`, `../api/resend-verification.action`, and `next/navigation`; render with `renderWithQueryClient`):
  - only digits are accepted
  - typing the 6th digit does **not** submit; submit needs the button or Enter
  - the action is called once per submit and the button is disabled while pending
  - `CODE_INVALID` clears the input and shows "…used one of your 5 attempts"
  - `CODE_EXPIRED`, `CODE_NONE_ACTIVE`, and `CODE_ATTEMPTS_EXHAUSTED` show their copy and call an `onNeedsResend` prop
- [ ] T083 [P] [US3] Write failing tests in `src/features/auth/ui/ResendCodeButton.test.tsx` (fake timers, mock `../api/resend-verification.action`; render with `renderWithQueryClient`):
  - with `initialCooldownEndsAt` 60 s ahead, the button is disabled with a countdown ("Resend code in 60s") that ticks to enabled
  - without a cooldown it is enabled
  - a click → success shows "New code sent" and re-enters the 60 s cooldown
  - `RESEND_COOLDOWN` and `EMAIL_SEND_FAILED` show their copy and enter cooldown from `cooldownEndsAt`
  - an `emphasised` prop changes the variant
- [ ] T083a [P] [US3] Write failing tests in `src/_pages/verify-email/ui/VerifyEmailPage.test.tsx` (mock `next/headers` with the T005 jar and `VerifyEmailForm` through the barrel; set the clock with `vi.setSystemTime`): with `tg_code_sent_at` 20 s ago it passes `initialCooldownEndsAt` = sent time + 60 000 ms; without the cookie, or after 60 s, it passes `null`; it renders the "Verify your email" heading

### Implementation for User Story 3

- [ ] T084 [P] [US3] Implement `src/features/auth/model/verify-email.schema.ts` (`VerifyEmailSchema = z.object({ code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code") })`)
- [ ] T085 [P] [US3] Implement `src/features/auth/config/verification.ts` (`RESEND_COOLDOWN_MS = 60_000`, `VERIFICATION_MAX_ATTEMPTS = 5`) and `src/features/auth/lib/cooldown.ts` (`getCooldownEndsAt`, `secondsRemaining`)
- [ ] T086 [US3] Implement `src/features/auth/api/verify-email.action.ts` (`"use server"`): `authedFetch("/auth/verify-email", { method: "POST", body: { code }, isSessionFailure: (e) => !isVerifyCodeError(e.message) })`, then map with `mapBackendError("verify-email", …)`. A successful result returns `redirectTo: "/map"` and performs no refresh or re-login (FR-016)
- [ ] T087 [US3] Implement `src/features/auth/api/resend-verification.action.ts` (`"use server"`): `authedFetch("/auth/resend-verification", { method: "POST" })`. On `204`, `429`, and `503`, call `writeCodeSentAt(await cookies(), now)` and return `cooldownEndsAt: now + RESEND_COOLDOWN_MS`. The result type is `AuthActionResult<{ cooldownEndsAt: number }>`, extended with `cooldownEndsAt` on the failure branch
- [ ] T088 [US3] Implement `src/features/auth/api/use-verify-email.ts` and `src/features/auth/api/use-resend-verification.ts` (`"use client"`; `useAuthMutation`)
- [ ] T089 [US3] Implement `src/features/auth/ui/ResendCodeButton.tsx` (`"use client"`; props `initialCooldownEndsAt: number | null` and `emphasised?: boolean`; a 1 s `setInterval` countdown; `aria-live="polite"` status text; state machine per data-model §5)
- [ ] T090 [US3] Implement `src/features/auth/ui/VerifyEmailForm.tsx` (`"use client"`):
  - RHF + `zodResolver(VerifyEmailSchema)`
  - shadcn `InputOTP` with 6 slots, `maxLength={6}`, `pattern={REGEXP_ONLY_DIGITS}`, `autoComplete="one-time-code"`, value held as a string
  - explicit submit with no auto-submit
  - `FormErrorAlert`
  - keeps `needsResend` state, passed to `ResendCodeButton` as `emphasised` (data-model §5)

  The form composes `ResendCodeButton` and takes `initialCooldownEndsAt` as a prop

- [ ] T091 [US3] Export `VerifyEmailForm` and `getCooldownEndsAt` from `src/features/auth/index.ts`. Implement `src/_pages/verify-email/ui/VerifyEmailPage.tsx`, an RSC that:
  - reads `readCodeSentAt(await cookies())` from `@/entities/session`
  - computes `getCooldownEndsAt(…, Date.now())` (from `@/features/auth`)
  - renders a heading ("Verify your email"), an explanation, and `<VerifyEmailForm initialCooldownEndsAt={…} />`

  Also create `src/_pages/verify-email/index.ts` and the thin route `app/(auth)/verify-email/page.tsx`. Once `/verify-email` exists, remove the `as Route` cast on `VERIFY_EMAIL_ROUTE` in `src/features/auth/api/use-auth-mutation.ts` (T042)

**Checkpoint**: Quickstart scenarios 1, 4–8, and 11 pass. The full P1 flow (signup → verify → map,
plus login) works end to end. **This is the recommended MVP release point.**

---

## Phase 6: User Story 4 — Continue with Google (Priority: P2)

**Goal**: A single full-width "Continue with Google" button on login and signup does a top-level
navigation to the backend. `/oauth/complete` strips the handoff token, exchanges it exactly once on
the server, and routes to `/map` or `/verify-email`, or shows a code-specific error with a retry.

**Independent Test**: Click Continue with Google and complete consent. The URL bar never keeps
`?token=`, the backend log shows exactly one `POST /auth/oauth/exchange` (even in `pnpm dev`
StrictMode), and you land on `/map`. Each `?error=` value shows its own message (quickstart
scenarios 16–19).

### Tests for User Story 4 (write first; they MUST fail) ⚠️

- [ ] T092 [P] [US4] Write failing tests in `src/features/auth/model/oauth-complete-params.schema.test.ts`. `parseOAuthCompleteParams(searchParams)`:
  - `{ token: "x" }` → `{ kind: "token", token: "x" }`
  - each of the 4 `OAuthErrorCode`s → `{ kind: "error", error }`
  - an unknown error, an empty token, or no params → `{ kind: "error", error: "oauth_failed" }`
  - an array-valued param → first value or `oauth_failed`
- [ ] T093 [P] [US4] Write failing tests in `src/features/auth/api/exchange-oauth-token.action.test.ts`:
  - `200` → cookies set, then `GET /auth/me`: verified → `"/map"`, unverified → `"/verify-email"`
  - `401` → `OAUTH_FAILED`; `429` → `OAUTH_RATE_LIMITED`; network → `NETWORK_ERROR`
  - an empty token → `OAUTH_FAILED` with no fetch
  - exactly one `POST /auth/oauth/exchange` per call
- [ ] T094 [P] [US4] Write failing tests in `src/features/auth/ui/GoogleSignInButton.test.tsx`: it renders an `<a>` (not a `<button>`) whose `href` is `${NEXT_PUBLIC_API_URL}/auth/google`, labelled "Continue with Google", with a decorative Google logo (`alt=""`) and full width. No GitHub or Discord options exist. `AuthDivider` renders "or" with separators
- [ ] T095 [P] [US4] Write failing tests in `src/features/auth/ui/OAuthErrorCard.test.tsx`: for `access_denied`, `email_already_in_use`, `too_many_requests`, and `oauth_failed`, plus the exchange failures `OAUTH_FAILED`, `OAUTH_RATE_LIMITED`, and `NETWORK_ERROR`, it renders the matching copy in `role="alert"`, a "Try again" link to the Google start URL, and a "Back to log in" link to `/login`
- [ ] T096 [P] [US4] Write failing tests in `src/features/auth/ui/OAuthCompleteHandler.test.tsx` (mock `../api/exchange-oauth-token.action` and `next/navigation`):
  - wrapped in `<StrictMode>` with `{ kind: "token" }`, the action is called **exactly once**
  - `history.replaceState(null, "", "/oauth/complete")` is called **before** the action
  - while exchanging it shows "Signing you in…" with a spinner
  - success → `router.replace(redirectTo)`
  - failure → `OAuthErrorCard` with the mapped code
  - the action **rejects** → `OAuthErrorCard` with `NETWORK_ERROR` (the "Signing you in…" spinner never stays up), and the action is still called only once
  - `{ kind: "error" }` → `replaceState` is still called, no action call, and the error card is shown
- [ ] T096a [P] [US4] Extend `src/_pages/login/ui/LoginPage.test.tsx` and `src/_pages/register/ui/RegisterPage.test.tsx`: each page renders the "or" divider and a "Continue with Google" link whose `href` is the Google start URL, below the form
- [ ] T096b [P] [US4] Write failing tests in `src/_pages/oauth-complete/ui/OAuthCompletePage.test.tsx` (mock `OAuthCompleteHandler` through the barrel): `searchParams` `{ token: "x" }` gives the handler `{ kind: "token", token: "x" }`, and `{}` gives `{ kind: "error", error: "oauth_failed" }`

### Implementation for User Story 4

- [ ] T097 [P] [US4] Implement `src/features/auth/model/oauth-complete-params.schema.ts` (`OAuthErrorCodeSchema`, `OAuthCompleteParamsSchema`, `parseOAuthCompleteParams`) per data-model §3
- [ ] T098 [P] [US4] Implement `src/features/auth/config/google.ts` (`GOOGLE_START_URL = \`${publicEnv.NEXT_PUBLIC_API_URL}/auth/google\``)
- [ ] T099 [US4] Implement `src/features/auth/api/exchange-oauth-token.action.ts` (`"use server"`; input `z.object({ token: z.string().min(1) })`; `backendFetch("/auth/oauth/exchange", { schema: TokenPairSchema })` → `writeTokenPair` → `getCurrentUser` → `redirectTo`; map with `mapBackendError("oauth-exchange", …)`)
- [ ] T100 [P] [US4] Implement `src/features/auth/ui/GoogleSignInButton.tsx` (an RSC-safe `<a href={GOOGLE_START_URL}>` styled with `buttonVariants({ variant: "outline" })` from `@/shared/ui/button` (or the Base UI `render` prop), full width, `next/image` `/icons/google.png` with `alt=""`) and `src/features/auth/ui/AuthDivider.tsx` (shadcn `Separator` + "or")
- [ ] T101 [P] [US4] Implement `src/features/auth/ui/OAuthErrorCard.tsx` (props `code: AuthErrorCode`; `FormErrorAlert`-style copy; "Try again" `<a href={GOOGLE_START_URL}>`; "Back to log in" `next/link` → `/login`)
- [ ] T102 [US4] Implement `src/features/auth/ui/OAuthCompleteHandler.tsx` (`"use client"`; props `params: OAuthCompleteParams`; a `useEffect` that calls `history.replaceState(null, "", "/oauth/complete")` first, guarded by `const started = useRef(false)`, then calls `exchangeOAuthToken` directly (not through a retrying wrapper), catching a rejected call (log it, show `NETWORK_ERROR`); maps the param error codes to `OAUTH_ACCESS_DENIED`, `OAUTH_EMAIL_IN_USE`, `OAUTH_RATE_LIMITED`, or `OAUTH_FAILED`)
- [ ] T103 [US4] Export `GoogleSignInButton`, `AuthDivider`, `OAuthCompleteHandler`, and `parseOAuthCompleteParams` from `src/features/auth/index.ts`. Render `<AuthDivider />` and `<GoogleSignInButton />` below the form in both `src/_pages/login/ui/LoginPage.tsx` and `src/_pages/register/ui/RegisterPage.tsx`, positioned per Figma `1:2` (one full-width button replacing the three icons). This makes T096a pass
- [ ] T104 [US4] Implement `src/_pages/oauth-complete/ui/OAuthCompletePage.tsx` (async RSC that takes `searchParams`, parses it with `parseOAuthCompleteParams`, and renders `<OAuthCompleteHandler params={…} />`), `src/_pages/oauth-complete/index.ts`, and the thin route `app/(auth)/oauth/complete/page.tsx` (renders `<OAuthCompletePage searchParams={searchParams} />`)

**Checkpoint**: Quickstart scenarios 16–19 pass, and US1–US3 still pass.

---

## Phase 7: User Story 5 — Navigation Between Login and Signup (Priority: P2)

**Goal**: The login page links to signup and the signup page links to login.

**Independent Test**: On `/login`, click "Sign up" → `/register`. On `/register`, click "Log in" →
`/login` (quickstart scenario 20, first two parts).

### Tests for User Story 5 (write first; they MUST fail) ⚠️

- [ ] T105 [US5] Extend `src/_pages/login/ui/LoginPage.test.tsx` to assert a link named "Sign up" with `href="/register"`, and extend `src/_pages/register/ui/RegisterPage.test.tsx` (from T072a) to assert a link named "Log in" with `href="/login"`

### Implementation for User Story 5

- [ ] T106 [US5] Add the switch-page prompt below the Google button using `next/link`, styled per Figma links (Hanken SemiBold 14/20, `text-link`): "Don't have an account? Sign up" in `src/_pages/login/ui/LoginPage.tsx`, and "Already have an account? Log in" in `src/_pages/register/ui/RegisterPage.tsx`

**Checkpoint**: Quickstart scenario 20 (login ↔ register) passes.

---

## Phase 8: User Story 6 — Password Recovery & Reset (Priority: P3)

**Goal**: The user requests a reset link and always sees a neutral confirmation. The reset page
strips the token from the URL, sets a new password, clears this browser's session, and shows every
distinct backend outcome.

**Independent Test**: Submit registered and unregistered emails on `/forgot-password`; the
confirmation is byte-identical. Open `/reset-password?token=…`; the URL immediately becomes
`/reset-password`. Set a new password to get success plus "Log in", and confirm the old session is
gone. Reusing or replacing the link shows the distinct messages (quickstart scenarios 20, last part,
and 21–23).

### Tests for User Story 6 (write first; they MUST fail) ⚠️

- [ ] T107 [P] [US6] Write failing tests in `src/features/auth/model/forgot-password.schema.test.ts`: `ForgotPasswordSchema` validates `email`, and `ForgotPasswordResponseSchema` requires `{ message: string }`
- [ ] T108 [P] [US6] Write failing tests in `src/features/auth/api/forgot-password.action.test.ts`: `200` → `{ ok: true }`, and the result does **not** include the backend `message`; `429` → `RATE_LIMITED`; network → `NETWORK_ERROR`; invalid input → `VALIDATION` with no fetch
- [ ] T109 [P] [US6] Write failing tests in `src/features/auth/ui/ForgotPasswordForm.test.tsx` (mock `../api/forgot-password.action`; render with `renderWithQueryClient`): success replaces the form with the exact constant `FORGOT_PASSWORD_CONFIRMATION`, identical across two different emails (SC-008); `RATE_LIMITED` shows its copy; the pending state is disabled
- [ ] T110 [P] [US6] Write failing tests in `src/features/auth/model/reset-password.schema.test.ts`: `ResetPasswordSchema` (non-empty `token`; password 8–72; confirm matches) and `parseResetPasswordParams` (`{ token?: string }`, where an empty or array value gives `undefined`)
- [ ] T111 [P] [US6] Write failing tests in `src/features/auth/api/reset-password.action.test.ts`:
  - the body is exactly `{ token, password }`
  - `204` → `{ ok: true }` and all `tg_*` cookies deleted
  - `RESET_ALREADY_USED` → cookies deleted
  - `RESET_INVALID`, `RESET_EXPIRED`, and `RESET_REPLACED` → cookies untouched
  - `RESET_SAME_PASSWORD` → `fieldErrors.password`
  - `429` → `RATE_LIMITED`, with cookies untouched
  - network → `NETWORK_ERROR`
- [ ] T112 [P] [US6] Write failing tests in `src/features/auth/ui/ResetPasswordForm.test.tsx` (mock `../api/reset-password.action`; render with `renderWithQueryClient`):
  - on mount `history.replaceState(null, "", "/reset-password")` is called, and the token is kept in component state and submitted
  - with no token, the "invalid link" state shows a "Request a new link" link → `/forgot-password`
  - success shows the "signed out everywhere" message plus a "Log in" link → `/login`
  - `RESET_ALREADY_USED`, `RESET_REPLACED`, `RESET_EXPIRED`, and `RESET_INVALID` each show distinct copy; the last three include "Request a new link"
  - `RESET_SAME_PASSWORD` shows a field error on password
- [ ] T112a [P] [US6] Extend `src/features/auth/ui/LoginForm.test.tsx`: a "Forgot password?" link with `href="/forgot-password"` sits beside the password label
- [ ] T112b [P] [US6] Write failing tests in `src/_pages/forgot-password/ui/ForgotPasswordPage.test.tsx` (mock `ForgotPasswordForm` through the barrel): it renders the "Reset your password" heading and `ForgotPasswordForm`
- [ ] T112c [P] [US6] Write failing tests in `src/_pages/reset-password/ui/ResetPasswordPage.test.tsx` (mock `ResetPasswordForm` through the barrel): `searchParams.token` reaches the form as `initialToken`; an empty or array value gives `undefined`; it renders the "Set a new password" heading

### Implementation for User Story 6

- [ ] T113 [P] [US6] Implement `src/features/auth/model/forgot-password.schema.ts` (`ForgotPasswordSchema`, `ForgotPasswordResponseSchema`) and `src/features/auth/config/forgot-password.ts` (`FORGOT_PASSWORD_CONFIRMATION = "If that email is registered, a reset link has been sent."`)
- [ ] T114 [US6] Implement `src/features/auth/api/forgot-password.action.ts` (`"use server"`; `backendFetch("/auth/forgot-password", { schema: ForgotPasswordResponseSchema })`; never forwards the backend message) and `src/features/auth/api/use-forgot-password.ts`
- [ ] T115 [US6] Implement `src/features/auth/ui/ForgotPasswordForm.tsx` (`"use client"`; `EmailField`, a "Send reset link" submit, and a success state rendering `FORGOT_PASSWORD_CONFIRMATION` plus a "Back to log in" link)
- [ ] T116 [P] [US6] Implement `src/features/auth/model/reset-password.schema.ts` (`ResetPasswordSchema` via `withPasswordConfirmation`, `ResetPasswordParamsSchema`, `parseResetPasswordParams`)
- [ ] T117 [US6] Implement `src/features/auth/api/reset-password.action.ts` (`"use server"`; sends only `{ token, password }`; `clearSession(await cookies())` on `204` and on `RESET_ALREADY_USED`; map with `mapBackendError("reset-password", …)`) and `src/features/auth/api/use-reset-password.ts`
- [ ] T118 [US6] Implement `src/features/auth/ui/ResetPasswordForm.tsx` (`"use client"`; prop `initialToken?: string`; a mount effect calls `replaceState` and stores the token in `useState`; two `PasswordField`s with `autoComplete="new-password"`; the states from data-model §5)
- [ ] T119 [US6] Export `ForgotPasswordForm`, `ResetPasswordForm`, and `parseResetPasswordParams` from `src/features/auth/index.ts`. Add a "Forgot password?" `next/link` → `/forgot-password` to `src/features/auth/ui/LoginForm.tsx`, beside the password label per Figma (this makes T112a pass)
- [ ] T120 [US6] Implement `src/_pages/forgot-password/ui/ForgotPasswordPage.tsx` (heading "Reset your password" plus `<ForgotPasswordForm />`), `src/_pages/forgot-password/index.ts`, and the thin route `app/(auth)/forgot-password/page.tsx`
- [ ] T121 [US6] Implement `src/_pages/reset-password/ui/ResetPasswordPage.tsx` (async RSC that takes `searchParams`, parses it with `parseResetPasswordParams`, and renders the heading "Set a new password" plus `<ResetPasswordForm initialToken={…} />`), `src/_pages/reset-password/index.ts`, and the thin route `app/(auth)/reset-password/page.tsx` (renders `<ResetPasswordPage searchParams={searchParams} />`)

**Checkpoint**: Quickstart scenarios 20–23 pass, and all earlier stories still pass.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Clean-up, security verification, and final validation across all stories.

- [ ] T122 [P] Delete the unused create-next-app assets `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, and `public/window.svg` (grep first to confirm nothing references them)
- [ ] T123 [P] Remove the stale coverage excludes in `vitest.config.ts` (`src/shared/lib/apollo/**`, `src/shared/providers/**`, `src/features/**/providers/**`, `src/features/skills/**`). Remove `src/entities/**` and `src/_app/**` from the excludes so the session entity and proxy count toward the 80% threshold, keeping `src/_app/providers/**` excluded. Then confirm `pnpm test:coverage` meets the thresholds
- [ ] T124 [P] Security sweep:
  - grep `src/` and `app/` for `dangerouslySetInnerHTML`, `localStorage`, `sessionStorage`, `document.cookie`, `jwt`/`atob` decoding of tokens, and `console.*` calls that include `token`, `code`, or `password` (expect none)
  - confirm every file importing `@/entities/session`, `backend-fetch`, `env.server`, or `kv` is a Server Action, proxy, RSC, or `server-only` module, and that client modules use only `import type` from `@/entities/session`
  - confirm `next.config.ts` has no `serverActions.allowedOrigins`
- [ ] T125 [P] Add a "Running locally" section to `README.md`: the env vars from research R14 (`NEXT_PUBLIC_API_URL`; the Upstash vars and `SESSION_CACHE_KEY` from `openssl rand -base64 32`, optional locally and required on Vercel), the backend `FRONTEND_URL` requirement, the `localhost` (not `127.0.0.1`) note, and the production blocker TODO `BACKEND_RATE_LIMIT_IP`
- [ ] T126 Run the automated gates from quickstart.md (`pnpm test:run`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, which needs no Upstash vars) and fix any failures
- [ ] T127 Run the 25 manual scenarios in `specs/001-auth-login-signup/quickstart.md` against the local backend, including the DevTools SC-010 cookie and storage checks, scenario 13 (three tabs → exactly one `/auth/refresh`), and scenario 25 (Figma pixel comparison at 1280×1024 and 375px, no CLS, keyboard-only pass through every form and the OTP input). Record any deviations in the PR description

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. T008 depends on T007. T008a is manual and blocks only the
  first deploy that includes US1.
- **Foundational (Phase 2)**: Depends on Setup and **blocks every user story**. Internal order:
  1. env (T009–T010) → api-error/backend-fetch (T011–T014)
  2. kv (T015–T019, including T018a)
  3. entities/user (T020–T021b; T021b needs T014) ∥ session schemas/cookies/crypto (T022–T027)
  4. session api (T028–T029) → coordinator (T030–T031) → authed-fetch (T032–T033) → session barrel (T034)
  5. feature auth model/lib/ui atoms (T035–T044; T039 needs T036)
  6. providers, tiers, and proxy (T044a–T049; T048 needs T021b, T034, and T047)
  7. widget and routes (T050–T054, including T052a and T053a)
- **US1 (Phase 3)**: Needs only Foundational.
- **US2 (Phase 4)**: Needs only Foundational. It can run in parallel with US1, but T077 and T067
  both touch `src/features/auth/index.ts`, so serialise those two.
- **US3 (Phase 5)**: Needs Foundational. It is functionally reached through US1 or US2 (you need a
  session), but you can test it independently with a session from the backend's signup endpoint.
- **US4 (Phase 6)**: Needs Foundational. T103 edits `LoginPage.tsx` (from US1) and `RegisterPage.tsx`
  (from US2), so it needs T068 and T077. T096a extends both page tests, so it needs T060 and T072a.
- **US5 (Phase 7)**: Needs T068 (US1) and T077 (US2), plus T103 (US4) if the links go below the
  Google button.
- **US6 (Phase 8)**: Needs Foundational. T112a extends `LoginForm.test.tsx` and T119 edits
  `LoginForm.tsx`, so they need T058 and T065 (US1).
- **Polish (Phase 9)**: Needs all desired stories to be complete.

### Within Each User Story

- Test tasks come first. Each must be run and seen to **fail** (Red) before the matching
  implementation task (Green). Then refactor.
- Order: schemas → actions → hooks → UI components → barrel exports → `_pages` composite → `app/` route.
- **Review gate (constitution)**: Do not start the next task until the current one passes its gate
  and the user has approved it. For an implementation task, the gate is: it compiles and all tests
  pass. For a test task, it is the **Red-task gate** (constitution v1.5.0): the new tests fail for
  the expected reason and every previously passing test still passes. Make one atomic conventional
  commit per task (`test:`, `feat:`, `refactor:`, `chore:`). A `test:` commit can stay local until
  its Green task passes, because the pre-push hook runs `test:run`, `typecheck`, and `build`.

### Parallel Opportunities

- Setup: T003, T004, T005, T006, and T007 run together after T001 and T002. T008a (manual) can
  happen at any time.
- Foundational test-writing: T009, T011, T015, T016, T018a, T020, T021a, T022, T024, T026, T028, T035,
  T037, T041, T043, T044a, T046, T050, T052a, and T053a touch different files and can be written
  together.
- After Foundational: US1, US2, US3, and US6 can proceed in parallel on separate branches. Only the
  barrel `src/features/auth/index.ts` and the two page files are shared edit points.
- Within each story, every test task marked [P] runs together, as do the [P] schema and config
  implementation tasks.

---

## Parallel Example: User Story 1

```bash
# Red: write all US1 tests together (different files):
Task: "T055 LoginSchema tests in src/features/auth/model/login.schema.test.ts"
Task: "T056 login action tests in src/features/auth/api/login.action.test.ts"
Task: "T057 logout action tests in src/features/auth/api/logout.action.test.ts"
Task: "T058 LoginForm tests in src/features/auth/ui/LoginForm.test.tsx"
Task: "T059 LogoutButton tests in src/features/auth/ui/LogoutButton.test.tsx"
Task: "T060 LoginPage tests in src/_pages/login/ui/LoginPage.test.tsx"
Task: "T060a MapPage Log out test in src/_pages/map/ui/MapPage.test.tsx"

# Green: independent implementation files together:
Task: "T061 LoginSchema in src/features/auth/model/login.schema.ts"
Task: "T063 logout action in src/features/auth/api/logout.action.ts"
Task: "T066 LogoutButton in src/features/auth/ui/LogoutButton.tsx"
```

## Parallel Example: User Story 3

```bash
Task: "T078 VerifyEmailSchema tests"      Task: "T079 cooldown lib tests"
Task: "T080 verifyEmail action tests"     Task: "T081 resendVerification action tests"
Task: "T082 VerifyEmailForm tests"        Task: "T083 ResendCodeButton tests"
Task: "T083a VerifyEmailPage tests"
# then
Task: "T084 VerifyEmailSchema"            Task: "T085 verification config + cooldown lib"
```

## Parallel Example: User Story 4

```bash
Task: "T092 OAuth params schema tests"    Task: "T093 exchange action tests"
Task: "T094 GoogleSignInButton tests"     Task: "T095 OAuthErrorCard tests"
Task: "T096 OAuthCompleteHandler StrictMode tests"
Task: "T096a page Google-link tests"      Task: "T096b OAuthCompletePage tests"
# then
Task: "T097 OAuth params schema"          Task: "T098 google start URL config"
Task: "T100 GoogleSignInButton + AuthDivider"  Task: "T101 OAuthErrorCard"
```

---

## Implementation Strategy

### MVP First

1. Phase 1 Setup → Phase 2 Foundational (the BFF core: the refresh coordinator and proxy are the
   riskiest parts, so build them test-first and early).
2. Phase 3 (US1 Login) → **validate**: a verified account can log in and out.
3. Phases 4 and 5 (US2 Signup and US3 Verify) → **validate** signup → verify → map. All three P1
   stories are required for a usable product, because the backend confines unverified sessions.
   **US1 + US2 + US3 is the recommended first release.**

### Incremental Delivery

1. Setup + Foundational → the proxy guards `/map`.
2. Add US1 → existing verified users can sign in (demo). Finish T008a before deploying it.
3. Add US2 + US3 → new users can onboard (**MVP release**).
4. Add US4 → Google sign-in (conversion boost).
5. Add US5 → login ↔ signup links (small; can be folded into the US1/US2 PRs if preferred).
6. Add US6 → password recovery.
7. Polish → coverage, security sweep, quickstart sign-off. **Before production**, resolve the
   backend TODO `BACKEND_RATE_LIMIT_IP`.

### Parallel Team Strategy

After Foundational: developer A takes US1 → US5, developer B takes US2 → US3, and developer C takes
US6 → US4. Coordinate edits to `src/features/auth/index.ts`, `LoginPage.tsx`, `RegisterPage.tsx`,
and `LoginForm.tsx`.

---

## Notes

- [P] = different files with no dependency on an incomplete task. [USn] maps the task to spec.md
  user story n.
- A test task is done only when its tests **fail for the right reason**: the module is missing or
  the behavior is not yet implemented.
- Never weaken a test to make it pass. If a contract turns out to be wrong, update
  `docs/backend-readme.md` or the contracts first, then the test.
- Every `401` that represents a business outcome (login, reset, OAuth exchange, verification codes)
  must **not** go through refresh-and-retry (FR-014).
- Keep components under about 150 lines. Split a sub-component inside the same slice's `ui/` if a
  form grows past that.
