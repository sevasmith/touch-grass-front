<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Touch Grass — Project Rules

## Project Stack

| Category             | Technology                                           |
| -------------------- | ---------------------------------------------------- |
| Framework            | Next.js 16 (App Router, RSC)                         |
| Language             | TypeScript 6, ESM (`"type": "module"`)               |
| UI                   | React 19, shadcn/ui v4 (`base-nova` style), Base UI  |
| Styling              | Tailwind CSS v4, CVA, clsx, tailwind-merge           |
| State                | Zustand 5                                            |
| Server State         | TanStack React Query 5                               |
| Forms                | React Hook Form 7 + @hookform/resolvers              |
| Validation           | Zod 4                                                |
| Auth                 | Auth0 (`@auth0/nextjs-auth0`)                        |
| Icons                | Lucide React                                         |
| Testing              | Vitest 4, Testing Library (React + DOM), happy-dom   |
| Linting / Formatting | ESLint 9 (flat config), Prettier, lint-staged, Husky |
| Package Manager      | pnpm 11                                              |

Path alias: `@/*` → `./src/*`

---

## Coding & Style Guidelines

### TypeScript

- Strict mode is on. Never use `any`; prefer `unknown` and narrow.
- Use `interface` for object shapes that may be extended; use `type` for unions, intersections, and mapped types.
- Prefer `const` assertions and `satisfies` over explicit type annotations where possible.

### Validation — Zod

- **All** runtime data boundaries (API responses, form inputs, URL params, env vars) must be validated with Zod schemas.
- Co-locate schemas next to the code that uses them (e.g., `model/` segment of a slice).
- Derive TypeScript types from schemas with `z.infer<>` — never duplicate types manually.

### Styling — Tailwind v4

- Use Tailwind v4 CSS-first configuration. Theme tokens are defined via `@theme` in CSS, not in a JS config file.
- Compose utility classes directly in JSX. Extract to CVA variants when a component has more than two visual states.
- Use `cn()` (from `@/shared/lib/utils`) to merge classes. Never concatenate class strings manually.
- Design tokens and CSS variables are defined in `src/_app/globals.css`.

### Components — shadcn/ui

- shadcn/ui components live in `src/shared/components/ui/`.
- Add new components via `npx shadcn@latest add <component>`. Do not manually create files that shadcn can scaffold.
- Customise shadcn components in place; do not wrap them in unnecessary abstraction layers unless adding real logic.

### React

- Default to React Server Components. Add `"use client"` only when the component needs browser APIs, hooks, or event handlers.
- Keep components small and single-purpose. A component file should rarely exceed ~150 lines.
- Prefer named exports.

### Testing

- Run tests with `pnpm test:run`. Environment is happy-dom.
- Place test files next to source files with a `.test.ts(x)` suffix.

---

## Architecture — Feature-Sliced Design (FSD)

### Directory Layout

```
app/                     ← Next.js App Router (routing & layouts ONLY)
src/
  _app/                  ← App-wide concerns (globals.css, providers, root styles)
  pages/                 ← FSD page-layer composites
  widgets/               ← Self-contained UI blocks composed from features/entities
  features/              ← User interactions & use-cases (e.g., auth-form, create-post)
  entities/              ← Core domain objects (e.g., user, session, post)
  shared/                ← Reusable, domain-agnostic code
    components/          ← Shared UI components
      ui/                ← shadcn/ui primitives
    lib/                 ← Utility functions (cn, helpers)
    hooks/               ← Shared hooks
    api/                 ← API client, query keys, fetch wrappers
    config/              ← Env vars, constants
    types/               ← Global type definitions
```

### Layer Hierarchy

Imports flow **strictly downward**. A layer may only import from layers below it:

```
app → pages → widgets → features → entities → shared
```

Violating this order is forbidden. `shared` may never import from any layer above it.

### Next.js App Router Integration

The `app/` directory is **exclusively** for routing concerns:

- `layout.tsx` — Layouts, providers, metadata.
- `page.tsx` — **Thin wrappers only.** A `page.tsx` must import and render a component from `src/pages/` or `src/widgets/`. It must not contain business logic, data fetching, or local state.
- `loading.tsx`, `error.tsx`, `not-found.tsx` — Framework boundary files only.

All business logic, data fetching, and non-trivial UI live inside `src/`.

### Strict Slice Isolation

Slices within the **same layer** must never import from one another.

```
❌  src/features/auth/  →  import from  src/features/profile/
✅  src/features/auth/  →  import from  src/entities/user/
✅  src/features/auth/  →  import from  src/shared/lib/
```

If two slices at the same layer need to share code, extract it to a lower layer.

### Public API Pattern

Every slice must expose its public surface through an `index.ts` barrel file at its root:

```
src/features/auth/
  index.ts          ← Public API (re-exports)
  ui/               ← Internal: components
  model/            ← Internal: store, schemas, types
  api/              ← Internal: data-fetching
  lib/              ← Internal: helpers
```

- External consumers import **only** from `@/features/auth` (the barrel).
- Deep imports like `@/features/auth/model/store` are **forbidden**.

### Slice Segment Conventions

Within a slice, organise code into these standard segments:

| Segment   | Purpose                                           |
| --------- | ------------------------------------------------- |
| `ui/`     | React components                                  |
| `model/`  | Zustand stores, Zod schemas, TypeScript types     |
| `api/`    | Data-fetching (React Query hooks, server actions) |
| `lib/`    | Pure helper functions                             |
| `config/` | Slice-specific constants                          |
