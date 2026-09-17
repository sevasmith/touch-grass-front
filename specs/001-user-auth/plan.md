# Implementation Plan: User Authentication

**Branch**: `001-user-auth` | **Date**: 2026-09-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-user-auth/spec.md`

> **Architecture note (2026-09-16)**: This is a **frontend-only** repository. The backend (PostgreSQL, password hashing, email dispatch, token generation, session storage) lives in a separate repo. This plan covers only what the frontend is responsible for: UI, client-side validation, backend API consumption, cookie management, and route protection.

---

## Summary

Build the authentication UI for Touch Grass: Login, Registration, Password Recovery, and Email Verification flows. The frontend calls the backend REST API for all auth operations. On success, the backend returns a session token; the frontend stores it in an HTTP-only cookie (via a Next.js Server Action, keeping the token server-side) and enforces route access via `proxy.ts`. All UI follows the FSD layer hierarchy with `features/auth` as the primary slice.

---

## Technical Context

**Language/Version**: TypeScript 6, ESM (`"type": "module"`)

**Primary Dependencies** (installed — no new packages needed):

- Next.js 16.3.1 (App Router, Server Actions, `proxy.ts` for route protection)
- React 19.2.8 (RSC default, `useActionState`, `useFormStatus`)
- React Hook Form 7 + `@hookform/resolvers` (client-side form state & validation)
- Zod 4 (schema validation — API response shapes, form inputs, URL params)
- shadcn/ui v4 (`base-nova` style) — form primitives, buttons, inputs
- Tailwind CSS v4 — styling
- Lucide React — show/hide password icons

**Removed Dependencies** (2026-09-16):

- ~~`@auth0/nextjs-auth0`~~ — removed; spec forbids third-party auth providers

**Backend responsibilities** (NOT this repo):

- Password hashing & verification
- Session / token creation and storage
- Email dispatch (verification, password reset)
- Token expiry and invalidation

**Storage**: N/A — no database in this repo. Session token received from backend API; stored in an HTTP-only cookie managed by Next.js Server Actions.

**Testing**: Vitest 4 + Testing Library + happy-dom (`pnpm test:run`)

**Target Platform**: Browser (Next.js frontend, statically-aware SSR)

**Project Type**: Frontend web application (Next.js App Router)

**Performance Goals**: Forms interactive within 100ms of page load; auth API call + redirect < 2s p95

**Constraints**: No third-party auth providers; no direct DB access; all backend calls go through `src/shared/api/`.

**Scale/Scope**: 4 authentication flows, ~12 UI components, ~4 FSD segments

---

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #        | Principle                                            | Status  | Notes                                                                  |
| -------- | ---------------------------------------------------- | ------- | ---------------------------------------------------------------------- |
| I        | Foundational Stack (TS + React + Next.js App Router) | ✅ PASS | All implementation uses App Router, RSC by default                     |
| I        | No new packages without approval                     | ✅ PASS | No new packages needed — all auth logic is in the backend              |
| II       | FSD architecture — correct layer usage               | ✅ PASS | `features/auth` slice; API types in `entities/`                        |
| II       | No same-layer cross-imports                          | ✅ PASS | Auth slice is self-contained                                           |
| II       | Public API via `index.ts` barrel                     | ✅ PASS | Planned                                                                |
| III      | No API calls in presentation components              | ✅ PASS | API calls in `features/auth/api/`; forms call Server Actions           |
| IV       | YAGNI — no speculative code                          | ✅ PASS | Implementing spec exactly                                              |
| V        | Global state only for session                        | ✅ PASS | Zustand store for client-side session state if needed                  |
| VI       | TDD — tests before implementation                    | ✅ PASS | quickstart.md defines test scenarios; tasks.md will order tests first  |
| VII      | Strict TS, no `any`, Zod at all boundaries           | ✅ PASS | All API responses and form inputs validated with Zod                   |
| VIII     | Defensive error handling                             | ✅ PASS | Network failures → user-facing error; no silent failures               |
| IX       | Loading states                                       | ✅ PASS | `pending` from `useActionState`/`useFormStatus` disables submit        |
| X        | Responsive + WCAG AA                                 | ✅ PASS | Mobile-first; decorative panel hidden < 768px; keyboard + aria         |
| Security | No hardcoded secrets                                 | ✅ PASS | Backend URL via `NEXT_PUBLIC_API_URL` env var; session cookie HttpOnly |
| Security | `@auth0/nextjs-auth0` removed                        | ✅ PASS | Package removed 2026-09-16                                             |

> **Constitution gate result**: ✅ ALL CLEAR

---

## Project Structure

### Documentation (this feature)

```text
specs/001-user-auth/
├── plan.md              ← This file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output (API DTOs + form schemas)
├── quickstart.md        ← Phase 1 output
├── contracts/           ← Phase 1 output
│   ├── backend-api.md   ← Backend endpoints consumed by this frontend
│   └── server-actions.md ← Next.js Server Actions wrapping backend calls
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── _app/
│   └── globals.css                        ← (existing) theme tokens
├── _pages/                                ← FSD page-layer composites (prefixed to avoid Next.js conflict)
│   ├── login/
│   │   ├── index.ts                       ← Public API barrel
│   │   └── ui/login-page.tsx              ← Composites LoginForm + decorative panel
│   ├── register/
│   │   ├── index.ts
│   │   └── ui/register-page.tsx
│   ├── forgot-password/
│   │   ├── index.ts
│   │   └── ui/forgot-password-page.tsx
│   ├── reset-password/
│   │   ├── index.ts
│   │   └── ui/reset-password-page.tsx
│   └── check-email/
│       ├── index.ts
│       └── ui/check-email-page.tsx
├── entities/
│   └── auth/
│       ├── index.ts                       ← Public API barrel
│       └── model/
│           └── schema.ts                  ← Zod schemas for backend API responses
│                                            (AuthUser, Session, ApiError)
├── features/
│   └── auth/
│       ├── index.ts                       ← Public API barrel
│       ├── ui/
│       │   ├── login-form.tsx             ← "use client"
│       │   ├── register-form.tsx          ← "use client"
│       │   ├── forgot-password-form.tsx   ← "use client"
│       │   ├── reset-password-form.tsx    ← "use client"
│       │   ├── check-email-page.tsx       ← RSC
│       │   ├── password-field.tsx         ← "use client" (show/hide toggle)
│       │   └── social-placeholder.tsx     ← RSC (disabled social buttons)
│       ├── model/
│       │   ├── schemas.ts                 ← Zod schemas for form inputs
│       │   └── types.ts                   ← Inferred TS types
│       └── api/
│           └── actions.ts                 ← Server Actions (call backend, set/clear cookie)
└── shared/
    ├── components/ui/                     ← (existing) shadcn primitives
    ├── lib/utils.ts                       ← (existing) cn()
    ├── api/
    │   ├── client.ts                      ← Typed fetch wrapper (base URL, auth header)
    │   └── session.ts                     ← Cookie read/write helpers (server-only)
    └── config/
        └── routes.ts                      ← Route constants (PUBLIC_ROUTES, PROTECTED_ROUTES)

app/
├── layout.tsx                             ← (existing) root layout
├── page.tsx                               ← Home → redirect based on auth state
├── login/
│   └── page.tsx                           ← Thin wrapper → LoginPage
├── register/
│   └── page.tsx                           ← Thin wrapper → RegisterPage
├── forgot-password/
│   └── page.tsx
├── reset-password/
│   └── page.tsx
├── check-email/
│   └── page.tsx
└── (dashboard)/                           ← Authenticated route group (future)

proxy.ts                                   ← Route protection (reads session cookie)
```

**Structure Decision**: Frontend-only Next.js project, FSD layers. Auth UI in `features/auth`. API response types in `entities/auth`. The shared API client (`src/shared/api/client.ts`) is the single point of contact with the backend. Server Actions in `features/auth/api/actions.ts` call the backend and manage the session cookie. No direct DB or email logic exists in this repo.

---

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

| Violation                         | Why Needed                                             | Simpler Alternative Rejected Because                                                   |
| --------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Server Actions wrapping API calls | Keeps session cookie management server-side (security) | Client-side fetch would expose token to JS; HttpOnly cookies require server-side write |
