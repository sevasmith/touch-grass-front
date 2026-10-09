<!--
SYNC IMPACT REPORT
==================
Version change:   1.5.0 → 1.6.0
Action:           The backend's `POST /auth/refresh` now has a 20-second replay window
                  (docs/backend-readme.md): repeating a just-rotated refresh token returns the same
                  new refresh token instead of revoking every session. Upstash Redis is dropped for
                  now, so there is no store shared between server instances.
                  1. Session Lifecycle: refresh is single-flight per server instance; across
                     instances the backend's replay window covers concurrent refreshes. A repeat
                     with the old token after the window is still a reuse that logs the user out
                     everywhere, so retries with the same token should stay inside the window.
                     "Session expired" joins the list of 401s that clear the session.
                  2. Scope: the refresh-coordination cache may be in-process; a shared store is no
                     longer implied.
                  MINOR: relaxes an existing rule without removing a principle; code built under
                  1.5.0 still complies.
Modified principles / sections:
  - Scope & Repository Boundaries (refresh-coordination cache wording)
  - Backend Integration Contract → Session Lifecycle (single-flight scope, replay window)
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ no change needed
  - .specify/templates/spec-template.md ✅ no change needed
  - .specify/templates/tasks-template.md ✅ no change needed
Follow-up: specs/001-auth-login-signup docs updated to match; the env check no longer requires the
  Upstash variables on Vercel (tasks T128–T129).
Previous amendment (1.4.0 → 1.5.0): Amendment raised by /speckit-analyze on 001-auth-login-signup
                  (findings D2, D3).
                  1. Scope and Security → Session Storage now explicitly allow a short-lived,
                     encrypted, server-only refresh-coordination cache. Single-flight refresh on a
                     serverless runtime needs state shared across instances, which the letter of
                     "only in cookies" and "no database access" forbade. MINOR: it materially
                     expands what is permitted.
                  2. Review Gates now define the gate for a test-first (Red) task, which by design
                     ends with failing tests that may not compile yet. PATCH-level clarification,
                     folded into this MINOR bump.
Modified principles / sections:
  - Scope & Repository Boundaries (refresh-coordination cache is not "database access")
  - Security & Data Constraints → Session Storage (bounded exception for the coordination cache)
  - Development Workflow & Quality Gates → Review Gates (Red-task gate)
Earlier amendment (1.3.0 → 1.4.0): Session Lifecycle separates a refresh the backend rejects
  (401: clear the session) from a transient refresh failure (keep the session).
Earlier amendment (1.2.0 → 1.3.0): aligned with the NestJS backend contract
  (docs/backend-readme.md): Backend-for-Frontend (BFF) session model, three-tier access, session
  lifecycle, API error contract, and URL-borne single-use token handling.
Deferred TODOs:
  - TODO(BACKEND_RATE_LIMIT_IP): Backend rate limits are per client IP. Behind the BFF every
    request originates from the Next.js server, so all users would share one limit
    (e.g. 10 logins/min globally). The backend MUST be configured to trust the proxy and derive
    the client IP from X-Forwarded-For (and the BFF MUST forward it) before production.
-->

# Touch Grass Constitution

## Scope & Repository Boundaries

This repository is **exclusively** the Touch Grass **Next.js frontend**. The **NestJS backend
lives in a separate repository** and is **out of scope** here. This frontend is a pure client of
an external API: it consumes the backend over **REST/GraphQL** and MUST NOT contain backend
service code, database access, or server-side business logic beyond what Next.js server
components, route handlers, and server actions require in order to call that external API.

- All domain data originates from the external REST/GraphQL API. This repository owns
  presentation, client-side state, and API-consumption logic only.
- "Server-side" in this document refers to the **Next.js server runtime** (RSC, route handlers,
  server actions) — never the NestJS backend.
- The backend API contract (endpoints, payloads, status codes, error messages, auth tiers) is
  documented in `docs/backend-readme.md`. It is the **source of truth** for all API-facing code;
  Zod schemas and specs MUST match it, and divergences MUST be resolved by updating that document
  from the backend repository — never by guessing.
- The Next.js server runtime acts as a **Backend-for-Frontend (BFF)**: it proxies calls to the
  external API and owns the session cookies (see _Backend Integration Contract_).
- A **refresh-coordination cache** (an in-process store, or a managed key-value store such as
  Redis, used only to de-duplicate token refreshes, see _Session Storage_) is part of what the
  BFF needs in order to call the external API. It is not "database access": it MUST hold no domain
  data, and its entries MUST expire within seconds. Any other server-side persistence remains
  forbidden.

**Rationale:** A clear frontend/backend boundary prevents scope creep, keeps this codebase a
focused API consumer, and avoids duplicating backend responsibilities that belong to a separate
repository.

## Core Engineering Principles

### I. Foundational Stack

All development MUST strictly utilize **TypeScript**, **React**, and **Next.js** using the App
Router paradigm, targeting a **frontend-only** environment that consumes an external REST/GraphQL
API.

- Next.js Server Components (RSC) MUST be used by default; the `"use client"` directive is only
  permitted when a component genuinely requires browser APIs, hooks, or event handlers.
- The UI layer MUST be built with **Tailwind CSS** for styling and **shadcn/ui** for component
  primitives. Competing CSS-in-JS solutions or alternative component libraries MUST NOT be
  introduced.
- Introducing new npm packages or third-party dependencies is FORBIDDEN without explicit user
  approval. Evaluate whether the requirement can be met by the existing stack first.

**Rationale:** Locking the stack prevents dependency sprawl and keeps the build surface
predictable, auditable, and maintainable.

### II. Feature-Sliced Design (FSD)

The project architecture MUST strictly follow the **Feature-Sliced Design** methodology.

- Code MUST be divided into the standard FSD layers: `shared`, `entities`, `features`, `widgets`,
  `_pages`, and `_app`. To avoid naming collisions with Next.js's native `app/` and `pages/`
  directories, the FSD layers inside `src/` MUST use underscore prefixes: `src/_app/` for the FSD
  app layer and `src/_pages/` for the FSD pages layer. The native Next.js router directory remains
  `app/` at the project root.
- Imports MUST only flow downward through the layer hierarchy:
  `app / _app → _pages → widgets → features → entities → shared`
- Cross-imports between slices at the **same layer** are FORBIDDEN. Shared logic MUST be extracted
  to a lower layer.
- Every slice MUST expose a public API via an `index.ts` barrel file. Deep imports (e.g.,
  `@/features/auth/model/store`) are FORBIDDEN for external consumers.
- All **shadcn/ui** components MUST be placed strictly within the `shared/ui` slice as flat files.
  Both generated shadcn/ui primitives and custom UI components share this directory as equals.
  Using nested structures like `shared/components/` or `shared/components/ui/` is FORBIDDEN.
  Placing these primitives in any higher layer (`entities`, `features`, `widgets`, `_pages`, `_app`)
  is FORBIDDEN, as domain-agnostic UI belongs at the lowest layer and any other placement violates
  the downward-only import rule.

**Rationale:** FSD enforces clear ownership boundaries, prevents coupling between unrelated
features, and makes the codebase navigable as it grows.

### III. Modularity & DRY (Don't Repeat Yourself)

Code duplication MUST be aggressively minimized and components MUST be highly cohesive.

- Logic repeated in more than two places MUST be extracted into a shared hook, utility, or
  `shared/` layer module.
- UI components MUST be isolated from business logic. API calls MUST NOT appear directly inside
  presentation components — use query hooks or server actions in the `api/` segment of a slice.
- Components SHOULD remain under ~150 lines; prefer single-purpose, named exports.

**Rationale:** DRY reduces maintenance cost, narrows the blast radius of bugs, and keeps
components independently testable.

### IV. Simplicity (YAGNI)

Do not over-engineer features or add abstractions until they are strictly necessary for the
current specification.

- Implement only what the current task requires. Placeholder code, speculative hooks, or
  "future-proof" generics added without an immediate use case are FORBIDDEN.
- Abstractions introduced solely for anticipated future requirements require explicit justification
  and user approval.

**Rationale:** Premature abstraction incurs real cost with uncertain benefit. Simpler code is
easier to test, review, and change.

### V. State Management

State MUST be kept as local as possible — within a component or feature slice — unless a
genuine application-wide concern justifies global state.

- Global state (e.g., Zustand stores) is ONLY permitted for application-wide concerns such as
  the authenticated user session and shared map coordinate data.
- Server state (data fetched from the external REST/GraphQL API) MUST be managed via
  **TanStack React Query**; do not duplicate server state in client stores.
- Access and refresh tokens MUST NOT be held in any client-side state (Zustand, React Query cache,
  `localStorage`, `sessionStorage`, or non-httpOnly cookies). Client-visible session state is
  limited to the user profile returned by `GET /auth/me` (`id`, `email`, `emailVerified`).

**Rationale:** Minimizing global state reduces unexpected interactions between unrelated features
and simplifies debugging.

### VI. Test-Driven Development (TDD)

Tests MUST be written and approved **before** implementing the corresponding feature logic. The
Red-Green-Refactor cycle is mandatory.

- No implementation code may be written until the test suite for the target behavior is
  established and has been reviewed/approved.
- Tests live next to source files with a `.test.ts(x)` suffix. Run with `pnpm test:run`
  (Vitest + happy-dom environment).

**Rationale:** Writing tests first forces clarity of requirements, provides a safety net for
refactoring, and prevents regression drift.

## Code Quality & UX Standards

### VII. Strict Type Safety

Strict TypeScript is mandatory across the entire codebase.

- The `any` type is FORBIDDEN. Use `unknown` and narrow explicitly.
- All API responses, state objects, and function parameters MUST have clearly defined interfaces
  or types derived via `z.infer<>` from Zod schemas.
- All runtime data boundaries (API responses, form inputs, URL params, env vars) MUST be
  validated with **Zod** schemas.

**Rationale:** Strong typing surfaces bugs at compile time, documents intent, and prevents
entire classes of runtime errors.

### VIII. Defensive Error Handling & Graceful Degradation

The application MUST never crash from external API failures or unexpected AI outputs.

- All async operations and calls to the external REST/GraphQL API MUST be wrapped in `try/catch`
  blocks. Silent failure is FORBIDDEN; errors MUST be logged appropriately.
- **Map Fallback:** If the AI routing engine fails to return valid GeoJSON, the system MUST
  gracefully parse and render the data as independent points, or display a friendly toast
  notification to the user.

**Rationale:** Distributed systems fail. Users should always see a coherent UI, not a crashed
page or a blank screen with no explanation.

### IX. Loading States & Performance

Blank white screens during data fetching or AI generation are FORBIDDEN.

- Every data-fetching operation MUST have a defined loading state — skeleton loaders or spinners
  as appropriate.
- Use Next.js `loading.tsx` boundary files, React Suspense, and React Query loading states to
  guarantee progressive disclosure of content.

**Rationale:** Perceived performance is part of UX. Users must always have visual feedback that
the application is working.

### X. Responsive & Accessible UI (a11y)

The UI MUST adhere to core **WCAG** principles and MUST be usable across all screen sizes.

- Use **mobile-first** Tailwind CSS conventions. The map interface and social feeds MUST scale
  gracefully across mobile, tablet, and desktop viewports.
- All interactive elements MUST be fully accessible via keyboard navigation, MUST maintain
  sufficient color contrast (WCAG AA minimum), and MUST include appropriate `aria-label`
  attributes for screen readers.

**Rationale:** Accessibility is not optional — it broadens reach, is often legally required,
and improves UX for all users (e.g., keyboard power users, low-light conditions).

## Security & Data Constraints

As a frontend-only client of an external REST/GraphQL API, this repository MUST treat all data
crossing the network boundary as untrusted and MUST never expose privileged credentials to the
browser.

- **Authentication Flow:** Unauthenticated access to protected routes MUST result in immediate
  redirection to the login flow. Authenticated users whose email is not verified MUST be
  redirected to the email-verification screen (see _Three-Tier Access_).
- **Data Sanitization:** All user inputs — especially natural language prompts and chat messages
  — MUST be aggressively sanitized before rendering to prevent Cross-Site Scripting (XSS) attacks.
- **Secrets Management:** API keys and secrets for the external API MUST NEVER be hardcoded into
  client-side code. All secrets MUST be managed via environment variables and accessed only within
  the Next.js server runtime; privileged calls MUST be proxied server-side rather than exposed to
  the browser.
- **Session Storage:** Access and refresh tokens MUST be stored only in cookies set by the
  Next.js server runtime with `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` in production.
  Tokens MUST NEVER be returned to, or readable by, browser JavaScript.
  **Single exception — refresh coordination:** so that concurrent or laggard requests can reuse a
  freshly rotated pair instead of replaying the old refresh token, the BFF MAY keep the outcome of
  a refresh in the refresh-coordination cache, subject to all of these conditions: it is encrypted
  with an authenticated cipher (e.g. AES-256-GCM) under a server-only secret; it is keyed by a hash
  of the old refresh token, never the plaintext; it expires within 30 seconds; and it is only ever
  read server-side to write the session cookies.
- **CSRF:** Because the session lives in cookies, every state-changing route handler MUST verify
  the request `Origin` matches the frontend origin. Server actions rely on Next.js's built-in
  origin check, which MUST NOT be disabled.
- **OAuth Exception:** Google sign-in MUST start with a top-level browser navigation directly to
  `{API_URL}/auth/google` (link or `window.location`), never via `fetch` or the BFF proxy — the
  backend's `state` cookie requires it. The public API base URL is therefore exposed as a
  `NEXT_PUBLIC_` variable; it is not a secret.

## Backend Integration Contract

These rules translate the backend's guarantees (see `docs/backend-readme.md`) into frontend
obligations. They are non-negotiable because violating them causes forced logouts, security
holes, or silent breakage.

### Session Lifecycle

- Access tokens and refresh tokens are **opaque**. The frontend MUST NOT decode, parse, or inspect
  them; user identity and verification state come exclusively from `GET /auth/me`.
- Refresh tokens are **single-use and rotate**. After every successful `POST /auth/refresh`, the
  BFF MUST persist the newly returned pair immediately, replacing the old one.
- Token refresh MUST be **single-flight per server instance**: concurrent requests on one instance
  for the same refresh token MUST share one in-flight refresh. Requests that land on different
  instances MAY each refresh: the backend answers a repeat of a just-rotated refresh token within
  20 seconds with the same new refresh token (its replay window), so no shared store is required.
- Outside the replay window, sending a rotated refresh token again is a reuse, and the backend
  revokes _all_ of the user's sessions. When the cookie already holds a newer refresh token, the
  BFF MUST use that one. A retry with the same token after a lost or failed response SHOULD happen
  within 20 seconds of the first attempt.
- Refresh MUST happen only in places that can write cookies (Next.js proxy/middleware, route
  handlers, server actions) — never inside a Server Component.
- On a `401` from a protected endpoint, the BFF MAY refresh once and retry once. If the backend
  **rejects** the refresh (`401`: invalid, expired, revoked, already used, or session expired), the
  session cookies MUST be cleared and the user redirected to login. A **transient** refresh
  failure (network error, timeout, `5xx`, or `429`) MUST NOT clear the session: the refresh token
  may still be valid, so the user gets a retryable error instead.
- Logout MUST call `POST /auth/logout` with the refresh token and clear the session cookies
  regardless of the response.

### Three-Tier Access

The backend has three access tiers, and the frontend MUST mirror them in routing:

| Tier       | Requirement                     | Frontend routes                                     |
| ---------- | ------------------------------- | --------------------------------------------------- |
| Public     | none                            | login, signup, forgot/reset password, OAuth landing |
| Unverified | valid session                   | email-verification screen                           |
| Verified   | valid session + `emailVerified` | everything else (default)                           |

- New routes MUST default to the **Verified** tier; opting into a looser tier requires explicit
  justification in the feature spec.
- A `403` with `message: "Email not verified"` from any endpoint MUST be handled globally by
  routing the user to the email-verification screen.

### API Error Contract

- Every backend error has the shape `{ statusCode: number, message: string | string[], error:
string }` (`message` is an array for `400` validation errors). This shape MUST be defined once
  as a shared Zod schema in `src/shared/api/` and used to parse every non-2xx response.
- Raw backend payloads, stack traces, or unparsed messages MUST NOT be rendered to users. Errors
  MUST be mapped to user-facing copy.
- When the backend deliberately distinguishes messages (e.g. reset link "already used" vs
  "replaced by a newer request"), the UI MUST preserve that distinction.
- `429 Too Many Requests` and `503` MUST produce a friendly, non-blocking message; actions with a
  known cooldown (e.g. resend verification code: 60 s) MUST be disabled for that duration.

### URL-Borne Single-Use Tokens

- Backend-mandated frontend routes MUST exist exactly as specified by the backend:
  `/reset-password?token=…` and `/oauth/complete?token=…|error=…`.
- Single-use tokens received in the URL MUST be removed from the address bar and history
  immediately (`history.replaceState`) and consumed **exactly once** — guarded against React
  StrictMode double-invocation (e.g. a `useRef` flag) or performed server-side.
- Every documented `error` code on `/oauth/complete` (`access_denied`, `email_already_in_use`,
  `too_many_requests`, `oauth_failed`) MUST map to a specific user-facing message with a retry
  path.

**Rationale:** The backend's security model (token rotation with reuse detection, single-use
handoff tokens, verification gating) only holds if the client respects it. Encoding these rules
here prevents each feature from rediscovering them the hard way.

## Development Workflow & Quality Gates

- **Atomic Commits:** Commits MUST be small and focused on a single task. Conventional commit
  message format is mandatory: `feat:`, `fix:`, `refactor:`, `chore:`, etc.
- **Review Gates:** Proceeding to the next task in the plan is FORBIDDEN until the current task
  compiles successfully, all relevant tests are passing, and the user has explicitly approved
  the output.
- **Red-task gate (TDD):** A test-first task (Principle VI) ends with failing tests by design. Its
  gate is instead: the new tests run and fail **for the expected reason** (the module under test
  does not exist yet, or the behavior is not implemented); every previously passing test still
  passes; and the user has approved the tests. A Red task's commit MAY stay local until its
  matching implementation (Green) task passes, because push-time hooks run the full test suite and
  type check.

## Governance

This constitution supersedes all other instructions, habits, or default AI behaviors for the
Touch Grass project. All code generation, pull requests, and architectural decisions MUST be
verified against these rules before proceeding.

**Conflict Resolution:** If a requested feature or user prompt conflicts with these principles
(e.g., violating FSD layer rules, bypassing strict TypeScript, ignoring accessibility standards),
the implementation MUST be refused. The constitutional violation MUST be explained, and an
alternative compliant path MUST be proposed.

**Amendment Procedure:**

- MAJOR bump: backward-incompatible principle removal or redefinition — requires explicit user
  sign-off.
- MINOR bump: new principle or section added or materially expanded.
- PATCH bump: clarifications, wording fixes, non-semantic refinements.

All amendments MUST update the version line and `Last Amended` date. The Sync Impact Report
HTML comment at the top of this file MUST be updated with each revision.

**Version**: 1.6.0 | **Ratified**: 2026-09-08 | **Last Amended**: 2026-10-09
