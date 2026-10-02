# Specification Quality Checklist: Authentication - Login, Signup, Email Verification & Google Sign-In

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-30
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Validation Results

### Iteration 2 — 2026-10-01 (alignment with constitution v1.3.0 and `docs/backend-readme.md`)

### Content Quality Assessment

✅ **PASS (with documented exception)** - User stories, edge cases, and success criteria are expressed as observable behavior. Route paths, the backend error shape, and status codes are part of the fixed backend contract. FR-034, FR-035, and FR-040–FR-042 name specific tools (React Hook Form, Zod, shadcn/ui, FSD); they are kept deliberately and marked _constitution-mandated_, because the constitution makes them binding project constraints rather than open implementation choices.

### Requirement Completeness Assessment

✅ **PASS** - 42 functional requirements, each testable, grouped by concern. A route-to-access-tier table (FR-006) justifies every route that is looser than the default Verified tier, as the constitution requires. Success criteria SC-001–SC-011 are measurable. Edge cases now cover single-flight refresh, transient refresh failures, verification-code vs. session `401` ambiguity, resend cooldown on arrival, and a rate-limited Google entry point. The per-IP rate-limit dependency (constitution TODO) is recorded under Assumptions.

### Feature Readiness Assessment

✅ **PASS** - Six user stories cover login, signup, email verification, Google sign-in, navigation, and password recovery. Every documented backend auth state maps to a user-facing outcome (SC-005). Re-approved 2026-10-01; ready for `/speckit-plan`.

## Notes

- Iteration 4 changes (2026-10-02, fixes from the second `/speckit-analyze`; choices approved by the user):
  - **Verification retry** (FR-016, US3-AS2, Edge Cases): the backend checks the code at most once per submission. A session `401` is refreshed and retried once, and a code error on that retry is shown inline instead of ending the session.
  - **Signup design** (SC-009, Assumptions): signup reuses the login layout as-is, with the heading "Join Touch Grass" and the subtitle "Create an account to start your journey." The pixel check applies to login only.
- Iteration 3 changes (2026-10-01, fixes from `/speckit-analyze`; choices approved by the user):
  - **Tiers**: FR-006 lists and justifies `/session-unavailable` (Public).
  - **Rate limits**: FR-037 covers every `429`: "Too many attempts, please wait a moment" for login and code entry, and "Too many requests, please try again later" everywhere else, including signup and reset-password.
  - **Design**: FR-040 and SC-009 allow accessibility-driven color deviations from Figma (WCAG AA); the deviations are listed under Assumptions.
- Iteration 2 changes (2026-10-01):
  - **Session model** now follows the constitution's Backend-for-Frontend rule: tokens live only in server-held cookies and are never readable by browser scripts (FR-009, FR-010, SC-010). The Google handoff exchange runs server-side (FR-024), so the CORS assumption no longer applies to it.
  - **Refresh**: single-flight (FR-012); refresh once and retry once, then go to login (FR-013); transient failures keep the session.
  - **Verification**: no refresh-and-retry on code `401`s (FR-014, SC-011); added the "no active code" state; resend cooldown applies on arrival from signup; `503` on resend is handled.
  - **URL tokens**: the reset token is stripped from URL/history (FR-028); the session is cleared after a reset or an "already used" reset (FR-030).
  - **Paths**: `/verify-email` and `/forgot-password`. The access tier of every route is declared (FR-006).
  - **Google `429`**: only the `too_many_requests` completion code is handled; a rate-limited entry point is outside frontend control.
  - Status reset to **Draft**, then re-approved by the user on 2026-10-01.
- Iteration 1 (2026-09-30): aligned flows with `docs/backend-readme.md` (OTP verification, refresh rotation, Google handoff, Google-only, length-only password policy, distinct reset outcomes).
- All checklist items pass on this iteration.
