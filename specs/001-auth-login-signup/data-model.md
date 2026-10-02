# Phase 1 Data Model: Authentication

**Feature**: `001-auth-login-signup` | **Date**: 2026-10-01 | **Plan**: [plan.md](./plan.md)

All shapes are **Zod schemas**, and their TypeScript types come from `z.infer<>` (constitution VII).
Each table lists where the schema lives (FSD slice/segment). Backend shapes are copied from
`docs/backend-readme.md`, the source of truth. If the backend changes, update that document first.

---

## 1. Backend boundary schemas

### ApiError — `src/shared/api/api-error.schema.ts`

The single shared error schema the constitution requires.

| Field        | Type                 | Rule                                   |
| ------------ | -------------------- | -------------------------------------- |
| `statusCode` | `number`             | int, 400–599                           |
| `message`    | `string \| string[]` | array only for `400` validation errors |
| `error`      | `string`             | e.g. `"Unauthorized"`                  |

If a non-2xx body fails to parse, the result is `{ statusCode: <http status>, message: "", error: "Unknown" }`
(it is mapped, never thrown).

### TokenPair — `src/entities/session/model/token-pair.schema.ts`

| Field          | Type     | Rule                                       |
| -------------- | -------- | ------------------------------------------ |
| `accessToken`  | `string` | non-empty, **opaque** (never decoded)      |
| `refreshToken` | `string` | non-empty, **opaque**, single-use, rotates |

Returned by `signup` (201), `login` (200), `refresh` (200), and `oauth/exchange` (200). It exists
only on the server: in cookies and in the encrypted coordinator cache. It is **never** serialized
into an action result or RSC payload.

### CurrentUser — `src/entities/user/model/current-user.schema.ts`

| Field           | Type      | Rule        |
| --------------- | --------- | ----------- |
| `id`            | `string`  | `z.uuid()`  |
| `email`         | `string`  | `z.email()` |
| `emailVerified` | `boolean` |             |

Returned by `GET /auth/me`, which `getCurrentUser(accessToken)` in
`src/entities/user/api/get-current-user.ts` calls (server-only). Keeping the fetch in `entities/user`
means `entities/session` never imports another entity (constitution II). It is the **only** session
data that may reach the browser (FR-021, constitution V). It determines `/verify-email` vs `/map`.

### ForgotPasswordResponse — `src/features/auth/model/forgot-password.schema.ts`

`{ message: string }`. It is parsed for shape validation only. The UI always renders the
**frontend constant** `FORGOT_PASSWORD_CONFIRMATION`, never the backend string, so the output is
byte-identical either way (SC-008).

---

## 2. Session state (server-held)

### SessionCookies — `src/entities/session/config/cookies.ts`

| Cookie            | Value             | Attributes                                                |
| ----------------- | ----------------- | --------------------------------------------------------- |
| `tg_at`           | access token      | HttpOnly, SameSite=Lax, Path=/, Secure(prod), Max-Age 30d |
| `tg_rt`           | refresh token     | HttpOnly, SameSite=Lax, Path=/, Secure(prod), Max-Age 30d |
| `tg_code_sent_at` | epoch ms (string) | HttpOnly, SameSite=Lax, Path=/, Secure(prod), Max-Age 900 |

**Session states** (derived; this is not stored anywhere):

```text
            no cookies ──────────────────────────────► ANONYMOUS
 login/signup/exchange OK ─► cookies set ─► GET /auth/me
                                         ├─ emailVerified=false ─► UNVERIFIED
                                         └─ emailVerified=true  ─► VERIFIED
 UNVERIFIED ── verify-email 204 ─────────────────────────────────► VERIFIED (same access token)
 any ── 401 on authed call ─► coordinator refresh
                              ├─ ok        ─► cookies replaced (same state)
                              ├─ revoked   ─► cookies cleared ─► ANONYMOUS (→ /login)
                              └─ transient ─► unchanged (retryable error / /session-unavailable)
 any ── logout ─► POST /auth/logout (ignore result) ─► cookies cleared ─► ANONYMOUS
 any ── reset-password 204 | "already used" ─► cookies cleared ─► ANONYMOUS
```

### Refresh coordinator records — `src/entities/session/lib/refresh-coordinator.ts`

Stored in the `KeyValueStore` (Upstash on Vercel deployments, memory locally and in tests). `h = hex(sha256(oldRefreshToken))`.

| Key             | Value                                                 | TTL  | Written by               |
| --------------- | ----------------------------------------------------- | ---- | ------------------------ |
| `rt:lock:{h}`   | request id (random UUID)                              | 10 s | `SET NX` winner          |
| `rt:result:{h}` | `RefreshOutcomeRecord`, AES-256-GCM encrypted, base64 | 30 s | winner on `200` or `401` |

`RefreshOutcomeRecord` (Zod, discriminated on `kind`):

- `{ kind: "ok", pair: TokenPair }`
- `{ kind: "revoked" }`, for any `401` from `/auth/refresh` (invalid, revoked, expired, already used)

`RefreshOutcome` (returned to callers, never stored) = `RefreshOutcomeRecord | { kind: "transient" }`.

**Invariants**:

- At most one `POST /auth/refresh` per old refresh token across all instances (SC-006).
- Any request carrying an old token within 30 s of its rotation gets the **new** pair from the cache
  instead of replaying the old one.
- A `transient` outcome is never cached, and the cookies are left untouched (FR-013).

### KeyValueStore port — `src/shared/lib/kv/`

```text
get(key) → string | null
setNx(key, value, ttlMs) → boolean
set(key, value, ttlMs) → void
del(key) → void
```

Adapters: `upstashStore` (REST via `fetch`; responses validated with
`UpstashResponseSchema = { result: unknown } | { error: string }`) and `memoryStore`.

---

## 3. Form input schemas — `src/features/auth/model/`

Each schema is used by RHF on the client **and** re-parsed inside the matching Server Action.

| Schema                 | Fields                                          | Rules                                                                                                                                                                                                    |
| ---------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LoginSchema`          | `email`, `password`                             | email: trimmed, required, `z.email()`; password: required (no length check on login, because legacy or long passwords must still reach the backend)                                                      |
| `RegisterSchema`       | `email`, `password`, `confirmPassword`          | email as above; password `min(8).max(72)`, **no composition rules** (FR-032); `confirmPassword` must equal `password` (refine; error on `confirmPassword`). The action sends only `{ email, password }`. |
| `VerifyEmailSchema`    | `code`                                          | `z.string().regex(/^\d{6}$/)`. Kept as a string, so leading zeros are preserved (FR-017).                                                                                                                |
| `ForgotPasswordSchema` | `email`                                         | as above                                                                                                                                                                                                 |
| `ResetPasswordSchema`  | `token` (hidden), `password`, `confirmPassword` | token non-empty; password `min(8).max(72)`; confirm must match                                                                                                                                           |

URL-param schemas (boundary validation, constitution VII):

| Schema                      | Source                  | Shape                                                                                                                                              |
| --------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OAuthCompleteParamsSchema` | `/oauth/complete` query | `{ token: string }` → `{ kind: "token" }`, else `{ error: OAuthErrorCode }` → `{ kind: "error" }`, else `{ kind: "error", error: "oauth_failed" }` |
| `ResetPasswordParamsSchema` | `/reset-password` query | `{ token?: string }`. A missing token renders the "invalid link" state immediately                                                                 |

`OAuthErrorCode` = `z.enum(["access_denied", "email_already_in_use", "too_many_requests", "oauth_failed"])`.
Unknown values are coerced to `oauth_failed`.

---

## 4. Error model — `src/features/auth/model/auth-error.ts`

`AuthErrorCode` is a closed `z.enum` of 25 codes. Every backend outcome maps to exactly one code (SC-005), and
every code maps to exactly one user-facing string in `AUTH_ERROR_COPY` (shown in
[contracts/backend-api.md](./contracts/backend-api.md#error-mapping)). Raw backend messages are
**never** rendered (constitution, API Error Contract).

```text
INVALID_CREDENTIALS, EMAIL_TAKEN, TOO_MANY_ATTEMPTS, RATE_LIMITED,
CODE_INVALID, CODE_EXPIRED, CODE_NONE_ACTIVE, CODE_ATTEMPTS_EXHAUSTED,
RESEND_COOLDOWN, EMAIL_SEND_FAILED,
OAUTH_ACCESS_DENIED, OAUTH_EMAIL_IN_USE, OAUTH_RATE_LIMITED, OAUTH_FAILED,
RESET_INVALID, RESET_EXPIRED, RESET_ALREADY_USED, RESET_REPLACED, RESET_SAME_PASSWORD,
SESSION_EXPIRED, EMAIL_NOT_VERIFIED,
VALIDATION, NETWORK_ERROR, SERVER_ERROR, UNEXPECTED
```

`TOO_MANY_ATTEMPTS` covers the short per-minute limits on login and verify-email. `RATE_LIMITED`
covers every other `429` (forgot-password, resend-verification, signup, reset-password, and any
endpoint without its own row).

`ActionResult<TSuccess, TError extends string>` in `src/shared/api/action-result.ts` is generic and
domain-agnostic: `shared` never imports from `features`, so it cannot know `AuthErrorCode`.
`features/auth` narrows it to `AuthActionResult<T> = ActionResult<T, AuthErrorCode>` in
`src/features/auth/model/auth-error.ts`, which gives every auth action this shape:

```text
{ ok: true } & T
| { ok: false, error: AuthErrorCode, fieldErrors?: Partial<Record<string, string>> }
```

---

## 5. UI state machines

### Verification screen (`/verify-email`)

```text
idle ──submit(valid 6 digits)──► submitting ──204──► redirect /map
                                   ├─ CODE_INVALID ──► idle (+ "attempt used" note, input cleared)
                                   ├─ CODE_EXPIRED | CODE_NONE_ACTIVE | CODE_ATTEMPTS_EXHAUSTED
                                   │                ──► needsResend (resend CTA emphasised)
                                   ├─ TOO_MANY_ATTEMPTS ──► idle (+ rate-limit alert)
                                   └─ SESSION_EXPIRED ──► redirect /login
Resend button:  cooldown(n s) ──tick──► ready ──click──► sending
                 ├─ 204 ─► cooldown(60) + "New code sent" (earlier codes now invalid)
                 ├─ 429 RESEND_COOLDOWN | RATE_LIMITED ─► cooldown(60) + message
                 └─ 503 EMAIL_SEND_FAILED ─► cooldown(60) + message
```

### OAuth completion (`/oauth/complete`)

```text
mount ─► replaceState(strip query) ─► guard(useRef)
  ├─ kind=error ─► showError(code)
  └─ kind=token ─► exchanging ─► ok ─► router.replace(/map | /verify-email)
                               ├─ fail ─► showError(OAUTH_FAILED | OAUTH_RATE_LIMITED | NETWORK_ERROR | …)
                               └─ call rejects ─► showError(NETWORK_ERROR)
showError ─► "Try again" (navigates to {API}/auth/google) | "Back to log in"
```

### Reset password (`/reset-password`)

```text
mount ─► replaceState(strip token; keep in component state)
  ├─ no token ─► invalidLink
  └─ form ─submit─► submitting
       ├─ 204 ─► success (session cleared) ─► "Log in" link
       ├─ RESET_ALREADY_USED ─► error (session cleared)
       ├─ RESET_REPLACED | RESET_EXPIRED | RESET_INVALID ─► error + "Request a new link"
       └─ RESET_SAME_PASSWORD ─► field error on password
```

---

## 6. Route tiers — `src/_app/proxy/route-tiers.ts`

`ROUTE_TIERS: Record<string, "public" | "unverified">` lists the looser routes explicitly.
**Anything not listed is `verified`** (constitution: new routes default to Verified). See
[contracts/session-and-proxy.md](./contracts/session-and-proxy.md#route-tiers).
