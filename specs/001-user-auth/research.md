# Research: User Authentication — 001-user-auth (Frontend)

Generated: 2026-09-16 | Updated: 2026-09-16 (Frontend-only architecture)

---

## 1. Session Strategy (Client-Side)

**Decision**: The frontend receives an opaque session token from the backend API upon successful login/registration. This token is stored in an `HttpOnly` cookie by Next.js Server Actions.

**Rationale**: `HttpOnly` cookies prevent XSS attacks from reading the token. Because Next.js Server Actions and `proxy.ts` run on the server, they can read the cookie and pass it to the backend in an `Authorization: Bearer <token>` header for subsequent requests.

---

## 2. Route Protection (Proxy / Middleware)

**Decision**: Next.js 16 `proxy.ts` (middleware) enforces route protection based on the presence of the `session` cookie.

**Proxy responsibilities**:

- Unauthenticated (no session cookie) → accessing a protected route: redirect `/login`
- Authenticated (cookie present) → accessing a public auth route (`/login`, `/register`): redirect `/dashboard`

_Note: Since the frontend proxy cannot hit the database to verify if a token is still valid or if an email is verified, it performs an optimistic check. The actual backend API will reject invalid tokens with a 401, at which point the frontend will clear the cookie and redirect to `/login`._

---

## 3. Form Handling Approach

**Decision**: React Hook Form (RHF) with Zod resolver for client-side validation; `useActionState` (React 19) for Server Action integration.

**Pattern**:

```
Client: RHF (field validation) → onSubmit → Server Action (via form action prop)
Server Action: Zod safeParse → Call Backend API → redirect or return ActionResult errors
Client: useActionState state → RHF setError → per-field error display
```

**Why RHF + useActionState together**:

- RHF handles instant client-side field validation and the `pending` state for FR-017 (disable submit button).
- `useActionState` handles the round-trip Server Action result (server-side API errors, network failures).

---

## 4. API Client Layer

**Decision**: A shared typed fetch wrapper at `src/shared/api/client.ts`.

**Rationale**: All Server Actions will use this client to communicate with the backend. It automatically attaches the `Authorization` header by reading the Next.js `cookies()` store. It parses the JSON response and throws typed errors for 4xx/5xx responses so the Server Actions can map them to UI messages.

---

## 5. Security & Dependencies

- **Removed**: `@auth0/nextjs-auth0` (spec forbids third-party auth).
- **Backend constraints**: No ORM (`typeorm`), no database driver (`pg`), no email SDK (`resend`), and no cryptography (`crypto`) logic exists in this repository. All secure logic is deferred to the external backend service.
