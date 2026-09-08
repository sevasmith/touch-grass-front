<!--
SYNC IMPACT REPORT
==================
Version change:   (none) → 1.0.0
Action:           Initial ratification — constitution created from user-supplied principles.
Added sections:
  - Core Engineering Principles (I–VI)
  - Code Quality & UX Standards (VII–X)
  - Security & Data Constraints
  - Development Workflow & Quality Gates
  - Governance
Removed sections: N/A (first version)
Modified principles: N/A (first version)
Deferred TODOs:   None
-->

# Touch Grass Constitution

## Core Engineering Principles

### I. Foundational Stack

All development MUST strictly utilize **TypeScript**, **React**, and **Next.js** using the App
Router paradigm.

- Next.js Server Components (RSC) MUST be used by default; the `"use client"` directive is only
  permitted when a component genuinely requires browser APIs, hooks, or event handlers.
- Introducing new npm packages or third-party dependencies is FORBIDDEN without explicit user
  approval. Evaluate whether the requirement can be met by the existing stack first.

**Rationale:** Locking the stack prevents dependency sprawl and keeps the build surface
predictable, auditable, and maintainable.

### II. Feature-Sliced Design (FSD)

The project architecture MUST strictly follow the **Feature-Sliced Design** methodology.

- Code MUST be divided into the standard FSD layers: `shared`, `entities`, `features`, `widgets`,
  `pages`, and `app` (mapped to Next.js `app/`).
- Imports MUST only flow downward through the layer hierarchy:
  `app → pages → widgets → features → entities → shared`
- Cross-imports between slices at the **same layer** are FORBIDDEN. Shared logic MUST be extracted
  to a lower layer.
- Every slice MUST expose a public API via an `index.ts` barrel file. Deep imports (e.g.,
  `@/features/auth/model/store`) are FORBIDDEN for external consumers.

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
- Server state (data-fetching) MUST be managed via **TanStack React Query**; do not duplicate
  server state in client stores.

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

- All async operations and external API calls MUST be wrapped in `try/catch` blocks. Silent
  failure is FORBIDDEN; errors MUST be logged appropriately.
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

- **Authentication Flow:** Unauthenticated access to protected routes MUST result in immediate
  redirection to the login flow.
- **Data Sanitization:** All user inputs — especially natural language prompts and chat messages
  MUST be aggressively sanitized before rendering to prevent Cross-Site Scripting (XSS) attacks.
- **Secrets Management:** API keys MUST NEVER be hardcoded into client-side code. All secrets MUST
  be managed via environment variables and accessed server-side only where possible.

## Development Workflow & Quality Gates

- **Atomic Commits:** Commits MUST be small and focused on a single task. Conventional commit
  message format is mandatory: `feat:`, `fix:`, `refactor:`, `chore:`, etc.
- **Review Gates:** Proceeding to the next task in the plan is FORBIDDEN until the current task
  compiles successfully, all relevant tests are passing, and the user has explicitly approved
  the output.

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

**Version**: 1.0.0 | **Ratified**: 2026-09-08 | **Last Amended**: 2026-09-08
