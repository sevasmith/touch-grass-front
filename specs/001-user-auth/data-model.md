# Data Model: User Authentication — 001-user-auth (Frontend)

Generated: 2026-09-16

---

## Overview

Because this is a **frontend-only** repository, we do not define ORM entities or database schemas. Instead, this document defines the Zod schemas for:

1. **API Responses (DTOs)** received from the backend API.
2. **Form Inputs** used by React Hook Form.

All schemas are placed in `src/entities/` (for backend responses) and `src/features/auth/model/` (for form inputs).

---

## 1. Backend API Response Types (DTOs)

**FSD location**: `src/entities/auth/model/schema.ts`

These schemas validate the data payloads returned by the external backend API.

### User DTO

Represents the authenticated user data returned on login, registration, or session verification.

```ts
import { z } from "zod"

export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  email: z.email(),
  emailVerified: z.boolean(),
  // Note: Password hashes, failed attempt counters, etc., are internal backend state
  // and are not exposed to the frontend.
})

export type AuthUser = z.infer<typeof AuthUserSchema>
```

### Session DTO

Represents the session token and metadata returned by the backend upon successful authentication.

```ts
export const SessionResponseSchema = z.object({
  token: z.string(), // Opaque token to be stored in HTTP-only cookie by the Next.js server
  expiresAt: z.string().datetime(), // ISO timestamp
  user: AuthUserSchema,
})

export type SessionResponse = z.infer<typeof SessionResponseSchema>
```

### API Error Response

Standardized error response from the backend.

```ts
export const ApiErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  // Optional field-level validation errors from the backend
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
})

export type ApiError = z.infer<typeof ApiErrorSchema>
```

---

## 2. Derived Form Schemas

**FSD location**: `src/features/auth/model/schemas.ts`

These are the Zod schemas used by React Hook Form resolvers on the client, and optionally re-validated in the Next.js Server Actions before calling the backend.

```ts
import { z } from "zod"

// Login
export const LoginSchema = z.object({
  email: z.email().toLowerCase().trim(),
  password: z.string().min(1, { error: "Password is required" }),
})

// Registration
export const RegisterSchema = z
  .object({
    email: z.email().toLowerCase().trim(),
    password: z
      .string()
      .min(8, { error: "Password must be at least 8 characters" }),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    error: "Passwords do not match",
    path: ["confirmPassword"],
  })

// Forgot Password
export const ForgotPasswordSchema = z.object({
  email: z.email().toLowerCase().trim(),
})

// Reset Password
export const ResetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { error: "Password must be at least 8 characters" }),
    confirmPassword: z.string(),
    token: z.string().min(1, { error: "Reset token is required" }), // hidden field
  })
  .refine((d) => d.password === d.confirmPassword, {
    error: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type LoginInput = z.infer<typeof LoginSchema>
export type RegisterInput = z.infer<typeof RegisterSchema>
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>
```

---

## 3. Server Action State

**FSD location**: `src/features/auth/model/types.ts`

This defines the result object returned by Next.js Server Actions to the `useActionState` hook on the client.

```ts
export interface ActionResult {
  /** Field-level errors keyed by form field name (from client or backend) */
  fieldErrors?: Record<string, string[]>
  /** Generic form-level error message (e.g., "Invalid credentials", network errors) */
  formError?: string
}
```
