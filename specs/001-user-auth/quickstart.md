# Quickstart Validation Guide: User Authentication — 001-user-auth

Generated: 2026-09-16

This guide documents runnable scenarios that prove the feature works end-to-end. It is not an implementation guide — code and migration details belong in `tasks.md`.

---

## Prerequisites

- Development server running: `pnpm dev`
- **External Backend API running** (or mocked locally via MSW)
- Environment variables set:
  ```bash
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  NEXT_PUBLIC_API_URL=http://localhost:8080 # or wherever the backend is running
  ```

_(Note: Because this is a frontend repo, we do not provision a database or email transport. The backend handles these. Tests can mock the REST API.)_

---

## Scenario 1 — Successful Login (US-1, SC-002)

**Goal**: A user with a verified account can log in and reach the dashboard in < 30 seconds.

**Setup**: Insert a verified user into the database with known credentials (use the seed script or direct DB insert).

**Steps**:

1. Navigate to `http://localhost:3000/login`
2. Enter registered email + correct password
3. Click "Log In"

**Expected outcomes**:

- Browser is redirected to `/dashboard` (or the authenticated root route)
- Session cookie `session` is set (HttpOnly, Secure in production)
- The page renders the authenticated state

---

## Scenario 2 — Invalid Credentials Error (US-1, FR-006)

**Steps**:

1. Navigate to `/login`
2. Enter a valid email but wrong password
3. Click "Log In"

**Expected outcomes**:

- Remain on `/login`
- Inline error: `"Invalid email or password"` (does not reveal which field is wrong)
- No network call on empty fields (client-side validation fires first)

---

## Scenario 3 — Account Lockout (FR-021)

**Steps**:

1. Attempt login with correct email, wrong password — repeat **5 times**
2. On 5th attempt, observe error message

**Expected outcomes**:

- Error: `"Account locked. Try again in 15 minutes."` (exact copy TBD in UI)
- DB: `User.lockedUntil = now + 15min`, `failedLoginAttempts = 5`
- A 6th attempt within 15 minutes returns the same lock message

**Unlock verification**:

- Advance system clock or manually set `lockedUntil` to past timestamp
- Successful login resets `failedLoginAttempts = 0` and `lockedUntil = null`

---

## Scenario 4 — Registration → Email Verification Gate (US-2, US-4)

**Steps**:

1. Navigate to `/register`
2. Enter a new email, strong password (≥ 8 chars), matching confirm
3. Submit

**Expected outcomes (immediate)**:

- Redirect to `/check-email`
- Verification email dispatched to the entered address
- DB: User row created (`emailVerified: false`), EmailVerificationToken created, Session created

**Verification link flow**:

1. Extract token from email (or inspect DB `EmailVerificationToken.tokenHash` → raw token was in the email URL)
2. Visit `http://localhost:3000/api/auth/verify-email?token=<rawToken>`

**Expected outcomes (after clicking link)**:

- Redirect to `/dashboard`
- DB: `User.emailVerified = true`, `EmailVerificationToken.usedAt = now`
- Session cookie allows access to protected routes

---

## Scenario 5 — Unverified Session Gate (US-4, FR-023)

**Steps**:

1. Register a new account (do NOT click the verification link)
2. Directly navigate to `http://localhost:3000/dashboard`

**Expected outcomes**:

- Redirect to `/check-email`
- Dashboard is inaccessible with an unverified session

---

## Scenario 6 — Resend Verification Email (US-4, FR-024)

**Steps**:

1. On the `/check-email` page, click "Resend verification email"

**Expected outcomes**:

- Confirmation message displayed
- New EmailVerificationToken created; new email dispatched
- Clicking "Resend" again within 60 seconds → rate-limit error

---

## Scenario 7 — Password Recovery Full Flow (US-3)

**Steps**:

1. Navigate to `/forgot-password`
2. Enter a registered email → submit
3. Observe: same confirmation message regardless of whether email is registered (anti-enumeration)
4. Open reset email → click link (e.g., `/reset-password?token=<rawToken>`)
5. Enter new valid password + confirm → submit

**Expected outcomes**:

- Redirect to `/dashboard`
- DB: `PasswordResetToken.usedAt = now`, `User.passwordHash` updated
- Old password no longer works; new password works

---

## Scenario 8 — Expired Reset Link (US-3, FR-014)

**Steps**:

1. Generate a reset token
2. Manually set `PasswordResetToken.expiresAt = past timestamp` in DB
3. Visit the reset link

**Expected outcomes**:

- Reset Password page shows error: `"This link has expired or has already been used."`
- CTA to request a new link

---

## Scenario 9 — Logout (US-1, FR-025)

**Steps**:

1. Log in as a verified user
2. Click "Log out"

**Expected outcomes**:

- Redirect to `/login`
- Session cookie is cleared (deleted or set with past expiry)
- DB: Session row deleted
- Navigating to `/dashboard` redirects to `/login`

---

## Scenario 10 — Already-Authenticated Redirect (FR-016)

**Steps**:

1. Log in as a verified user (session cookie set)
2. Navigate to `/login` or `/register`

**Expected outcomes**:

- Immediately redirected to `/dashboard` (proxy.ts handles this)

---

## Scenario 11 — Responsive Layout (SC-007, FR-003)

**Steps**:

1. Open `/login` in a browser at full desktop width
2. Observe: decorative left panel (brand wordmark) is visible
3. Resize to < 768px
4. Observe: decorative panel is hidden; form occupies full width

**Expected outcomes**:

- No layout overflow
- All form fields and buttons are accessible at mobile width

---

## Scenario 12 — Password Show/Hide Toggle (FR-026)

**Steps**:

1. On any auth form with a password field, click the show/hide icon
2. Observe field type toggles between `password` and `text`
3. Tab to the toggle using keyboard only

**Expected outcomes**:

- Toggle is keyboard-reachable and activatable with Enter/Space
- `aria-label` changes between `"Show password"` and `"Hide password"`

---

## Scenario 13 — Keyboard Navigation (SC-005, FR-019)

**Steps**:

1. Navigate to `/login` with keyboard only (Tab, Shift+Tab, Enter)
2. Complete the entire login flow without mouse

**Expected outcomes**:

- All fields, links, and buttons are reachable via Tab
- Focus order is logical (email → password → show/hide → forgot password → submit → sign up link)
- Errors are announced to screen readers (`aria-live` regions)

---

## Scenario 14 — Duplicate Email Registration (US-2, FR-010)

**Steps**:

1. Register with an email already in the database
2. Submit

**Expected outcomes**:

- Field-level error on email: `"An account with this email already exists"`
- No new user row created

---

## Scenario 15 — Email Service Failure During Registration (FR-022, Edge Cases)

**Setup**: Configure email transport to fail (e.g., invalid API key, or mock the email service to throw).

**Steps**:

1. Attempt registration with a new email

**Expected outcomes**:

- Form-level error: `"Unable to send verification email. Please try again later."`
- **No user row persisted** in DB (atomic rollback)
