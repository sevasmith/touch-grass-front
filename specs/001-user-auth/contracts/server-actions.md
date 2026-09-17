# Contracts: Server Actions — User Authentication (Frontend)

**Feature**: `001-user-auth`
**Layer**: `src/features/auth/api/actions.ts`
**Transport**: Next.js Server Actions (called from Client Components via `useActionState`)

---

## Conventions

- These Server Actions run on the Next.js server. They act as a BFF (Backend-For-Frontend) layer.
- They validate incoming form data, call the external backend REST API (`src/shared/api/client.ts`), and manage the HTTP-only `session` cookie.
- On **success**: perform a `redirect()` (from `next/navigation`).
- On **failure**: return an `ActionResult` object (`{ fieldErrors?, formError? }`). Never throw an error to the client.

---

## Action 1: `login`

```ts
async function login(
  prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult | undefined>
```

### Flow

1. Validate `formData` against `LoginSchema`. If invalid, return `fieldErrors`.
2. POST to backend `/api/auth/login`.
3. On backend 4xx: Parse backend error (e.g., "Invalid credentials", "Account locked") and return as `formError`.
4. On backend 5xx/network error: Return `formError: "Service unavailable. Please try again later."`
5. On success (200):
   - Extract `token` and `user.emailVerified` from response.
   - Set HTTP-only cookie `session` with the token.
   - If `!user.emailVerified`, `redirect('/check-email')`.
   - Else, `redirect('/dashboard')`.

---

## Action 2: `register`

```ts
async function register(
  prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult | undefined>
```

### Flow

1. Validate `formData` against `RegisterSchema`.
2. POST to backend `/api/auth/register`.
3. On backend error (e.g., "Email already exists"): Return mapped `fieldErrors` or `formError`.
4. On success (201):
   - Set HTTP-only cookie `session`.
   - `redirect('/check-email')` (user is unverified by default).

---

## Action 3: `logout`

```ts
async function logout(): Promise<never>
```

### Flow

1. Read `session` cookie.
2. If token exists, POST to backend `/api/auth/logout` with token in Auth header. (Fire and forget, or await).
3. Clear `session` cookie on the Next.js server.
4. `redirect('/login')`.

---

## Action 4: `forgotPassword`

```ts
async function forgotPassword(
  prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult | undefined>
```

### Flow

1. Validate `email`.
2. POST to backend `/api/auth/forgot-password`.
3. Handle network errors (return `formError`).
4. On success (202): `redirect('/forgot-password?sent=true')`.

---

## Action 5: `resetPassword`

```ts
async function resetPassword(
  prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult | undefined>
```

### Flow

1. Validate `password`, `confirmPassword`, and `token` (from hidden field).
2. POST to backend `/api/auth/reset-password`.
3. On backend 4xx (e.g., "Invalid or expired token"): Return `formError`.
4. On success (200):
   - Set HTTP-only cookie `session` with the new token.
   - `redirect('/dashboard')`.

---

## Action 6: `resendVerificationEmail`

```ts
async function resendVerificationEmail(
  prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult | undefined>
```

### Flow

1. Read `session` cookie. If missing, return error.
2. POST to backend `/api/auth/resend-verification` with Auth header.
3. On backend 429 (Rate Limited): Return `formError: "Please wait before requesting another email."`
4. On success (202): Return `{ formError: undefined }` (client shows success state).

---

## Action 7: `verifyEmail`

```ts
async function verifyEmail(token: string): Promise<ActionResult | undefined>
```

_(Called from a Server Component or Route Handler when a user clicks the link in their email)_

### Flow

1. POST to backend `/api/auth/verify-email` with `{ token }`.
2. On backend 4xx (invalid/expired): Redirect to `/check-email?error=expired`.
3. On success (200): Redirect to `/dashboard`.
