# Contracts: Backend API Contract — User Authentication

**Feature**: `001-user-auth`
**Layer**: `src/shared/api/client.ts`
**Transport**: HTTP REST (External Backend)

---

## Convention

This document defines the expected external backend API that the Next.js Server Actions will call. The base URL is provided by the `NEXT_PUBLIC_API_URL` environment variable.

All endpoints return JSON. On failure, they return an HTTP 4xx/5xx status code with a JSON payload matching the `ApiError` schema defined in `data-model.md`.

---

## 1. Login

**Method**: `POST`
**URL**: `/api/auth/login`

### Request Body

```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### Success Response (200 OK)

```json
{
  "token": "opaque_session_token_123",
  "expiresAt": "2026-09-23T12:00:00Z",
  "user": {
    "id": "uuid-1234",
    "email": "user@example.com",
    "emailVerified": true
  }
}
```

---

## 2. Register

**Method**: `POST`
**URL**: `/api/auth/register`

### Request Body

```json
{
  "email": "newuser@example.com",
  "password": "securepassword"
}
```

### Success Response (201 Created)

_Note: Backend automatically dispatches the verification email._

```json
{
  "token": "opaque_session_token_456",
  "expiresAt": "2026-09-23T12:00:00Z",
  "user": {
    "id": "uuid-5678",
    "email": "newuser@example.com",
    "emailVerified": false
  }
}
```

---

## 3. Logout

**Method**: `POST`
**URL**: `/api/auth/logout`

### Headers

- `Authorization: Bearer <session_token>`

### Success Response (204 No Content)

Empty body.

---

## 4. Forgot Password

**Method**: `POST`
**URL**: `/api/auth/forgot-password`

### Request Body

```json
{
  "email": "user@example.com"
}
```

### Success Response (202 Accepted)

Empty body. (Returns 202 even if email is unregistered to prevent enumeration).

---

## 5. Reset Password

**Method**: `POST`
**URL**: `/api/auth/reset-password`

### Request Body

```json
{
  "token": "raw_token_from_email",
  "password": "newsecurepassword"
}
```

### Success Response (200 OK)

Returns a new session token, logging the user in.

```json
{
  "token": "opaque_session_token_789",
  "expiresAt": "2026-09-23T12:00:00Z",
  "user": {
    "id": "uuid-1234",
    "email": "user@example.com",
    "emailVerified": true
  }
}
```

---

## 6. Verify Email

**Method**: `POST`
**URL**: `/api/auth/verify-email`

### Request Body

```json
{
  "token": "raw_token_from_email"
}
```

### Success Response (200 OK)

Empty body. (Backend updates the user record; Next.js frontend updates its session cookie flag).

---

## 7. Resend Verification Email

**Method**: `POST`
**URL**: `/api/auth/resend-verification`

### Headers

- `Authorization: Bearer <session_token>`

### Success Response (202 Accepted)

Empty body.
