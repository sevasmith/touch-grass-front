# Feature Specification: Authentication - Login, Signup, Email Verification & Google Sign-In

**Feature Branch**: `feat/login-page`

**Created**: 2026-09-30

**Status**: Approved (revised and re-approved 2026-10-01; revised 2026-10-02 with user-approved fixes from `/speckit-analyze`; revised 2026-10-09 for the backend's 20-second refresh replay window, constitution v1.6.0)

**Input**: User description: "Build the Login and Signup pages using our custom authentication flow." Updated to align frontend flows with the NestJS backend authentication model documented in `docs/backend-readme.md`. Revised 2026-10-01 to align with constitution v1.3.0 (Backend-for-Frontend session model, three-tier access, URL-borne token handling).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Email/Password Login (Priority: P1)

An existing, verified user visits the login page to access their Touch Grass account using their email and password. After successful authentication, a server-held session is established and they are redirected to the map view.

**Why this priority**: Core authentication flow is the foundation for all protected features. Without login, users cannot access any personalized functionality.

**Independent Test**: Create a verified test account, enter valid credentials on the login form, and verify a session is established (tokens never readable by browser scripts) and the user reaches `/map`.

**Acceptance Scenarios**:

1. **Given** a verified user with valid credentials on the login page, **When** they enter their email and password and click "Log In", **Then** they are authenticated, the returned `{ accessToken, refreshToken }` pair is stored in the server-held session (never exposed to browser scripts), and they are redirected to `/map`
2. **Given** a user with invalid credentials, **When** they submit the form, **Then** a single generic error message "Invalid email or password" appears (the system never reveals whether the email or the password was wrong)
3. **Given** a user who signed up with Google and has never set a password, **When** they attempt password login, **Then** they see the same generic "Invalid email or password" message
4. **Given** a user who logs in successfully but whose email is **not yet verified**, **When** authentication returns tokens, **Then** they are routed to the email verification screen instead of `/map`
5. **Given** a user on the login page, **When** they leave email or password empty and submit, **Then** field-level validation errors appear on the empty fields
6. **Given** a user on the login page, **When** they enter an improperly formatted email, **Then** a validation error appears before submission
7. **Given** a user who exceeds the login rate limit (5 attempts/minute), **When** they submit again, **Then** they see a "Too many attempts, please wait a moment" message

---

### User Story 2 - New User Registration (Priority: P1)

A new user visits the signup page to create their Touch Grass account with email and password. On success the backend creates an **unverified** account, returns a token pair, and emails a 6-digit verification code. The user is taken to the email verification screen.

**Why this priority**: New user acquisition is critical. Without signup, the user base cannot grow.

**Independent Test**: Fill out the signup form with a new email and a policy-compliant password, submit, and verify a session is established and the user lands on `/verify-email` (not `/map`).

**Acceptance Scenarios**:

1. **Given** a new user on the signup page, **When** they enter a valid email and a password of 8–72 characters and submit, **Then** their account is created, the token pair is stored in the server-held session, and they are redirected to `/verify-email` with the "Resend code" action already in its 60-second cooldown (a code was just sent)
2. **Given** a user entering an email that already exists, **When** they submit, **Then** an error message indicates the email is already registered
3. **Given** a user entering a password shorter than 8 or longer than 72 characters, **When** they submit, **Then** a validation error describes the length requirement
4. **Given** a user who leaves required fields empty, **When** they submit, **Then** validation errors appear on all empty required fields
5. **Given** a successful signup where the verification email fails to send on the backend, **When** the user reaches the verification screen, **Then** they can request a new code via "Resend code" once the initial cooldown ends (signup itself still succeeded)

---

### User Story 3 - Email Verification (OTP) (Priority: P1)

After signup (or when a returning unverified user logs in), the user must enter the 6-digit code emailed to them on the verification screen at `/verify-email`. Until verified, their session is confined by the backend to the verification, resend, and profile routes; every other protected route returns `403 Email not verified`.

**Why this priority**: The backend confines unverified sessions, so without a verification screen a newly signed-up user cannot use the app at all. This is part of the core P1 flow, not an add-on.

**Independent Test**: Sign up, read the 6-digit code (test inbox), enter it on the verification screen, and confirm the user is verified and redirected to `/map` **using the same access token** — no re-login or token refresh.

**Acceptance Scenarios**:

1. **Given** an unverified user on the verification screen, **When** they enter the correct 6-digit code and submit, **Then** the email is marked verified and they are redirected to `/map` without re-logging in
2. **Given** an unverified user, **When** they enter an incorrect code, **Then** they see "Invalid verification code" and are told an attempt was consumed (5 attempts per code); the code is checked by the backend exactly once per submission (a code error is never automatically retried)
3. **Given** an unverified user who exhausts all 5 attempts, **When** they submit again, **Then** they see "Too many attempts, please request a new verification code" and are prompted to resend
4. **Given** an unverified user whose code has expired, **When** they submit it, **Then** they see "Verification code expired" and are prompted to resend
5. **Given** an unverified user with no active code (never issued, already used, or replaced), **When** they submit a code, **Then** they see "No valid code — please request a new one" and are prompted to resend
6. **Given** an unverified user, **When** they click "Resend code", **Then** a new code is emailed, all earlier codes stop working, and a 60-second cooldown disables the resend button
7. **Given** an unverified user who clicks "Resend code" within 60 seconds of the last code, **When** the request is made, **Then** they see a "Please wait a moment before requesting another code" message and the button enters cooldown
8. **Given** an unverified user whose resend fails because the email provider is unavailable, **When** the request returns, **Then** they see "Unable to send the verification email, try again later" and the button enters the 60-second cooldown
9. **Given** an authenticated but unverified user who is deep-linked to any other protected route, **When** the route returns `403 Email not verified`, **Then** the app routes them to `/verify-email`
10. **Given** a code entry field, **When** the user types, **Then** only 6 numeric digits are accepted and leading zeros are preserved
11. **Given** a visitor with no session, **When** they open `/verify-email`, **Then** they are redirected to `/login`; **Given** an already-verified user, **When** they open `/verify-email`, **Then** they are redirected to `/map`

---

### User Story 4 - Continue with Google (Priority: P2)

A user signs in or signs up with Google. The frontend navigates the browser to the backend's Google entry point; after Google consent the browser returns to a dedicated completion page carrying a single-use handoff token (or an error code). The frontend's server side exchanges the handoff token for a real token pair and stores it in the server-held session.

**Why this priority**: Google sign-in is fully implemented on the backend and materially improves conversion, but email/password plus verification is the baseline that must ship first.

**Independent Test**: Click "Continue with Google", complete Google consent in a real browser, land on the completion page with `?token=...`, and verify a session is established (tokens never readable by browser scripts) and the user reaches `/map`.

**Acceptance Scenarios**:

1. **Given** a user on the login or signup page, **When** they click "Continue with Google", **Then** the browser performs a full-page navigation directly to the backend Google entry point (not a background request, and not through the frontend's server proxy)
2. **Given** a successful Google consent, **When** the browser returns to the completion page with `?token=<handoff>`, **Then** the token is immediately removed from the URL/history, the frontend's server side exchanges it for a `{ accessToken, refreshToken }` pair stored in the server-held session, and the user is redirected to `/map`
3. **Given** the completion page loads under React strict-mode double-effect behavior, **When** the exchange is triggered, **Then** it is guarded so the single-use handoff token is exchanged exactly once (a second attempt would fail as "already used")
4. **Given** the browser returns with `?error=access_denied`, **When** the completion page loads, **Then** the user sees a "Google sign-in was cancelled or not permitted" message with a "Try again" action
5. **Given** the browser returns with `?error=email_already_in_use`, **When** the completion page loads, **Then** the user sees a message explaining that email already belongs to an unverified account and is guided to log in with password / verify first
6. **Given** the browser returns with `?error=too_many_requests`, **When** the completion page loads, **Then** the user sees a rate-limit message and can retry later
7. **Given** the browser returns with `?error=oauth_failed` (or no token), **When** the completion page loads, **Then** the user sees a generic "Google sign-in failed, please try again" message
8. **Given** a handoff token whose exchange fails (invalid, expired, already used, or rate-limited), **When** the exchange returns an error, **Then** the user sees the generic "Google sign-in failed, please try again" message (or the rate-limit message for `429`) with a "Try again" action
9. **Given** a Google account whose email is already verified locally, the backend links it and the exchange succeeds — the frontend treats this as a normal successful login

---

### User Story 5 - Navigation Between Login and Signup (Priority: P2)

Users can switch between the login and signup pages depending on whether they already have an account.

**Why this priority**: Users often land on the wrong page. Smooth navigation reduces friction.

**Independent Test**: From the login page click "Sign up" and verify navigation to signup; from signup click "Log in" and verify return to login.

**Acceptance Scenarios**:

1. **Given** a user on the login page, **When** they click "Sign up", **Then** they navigate to `/register`
2. **Given** a user on the signup page, **When** they click "Log in", **Then** they navigate to `/login`

---

### User Story 6 - Password Recovery & Reset (Priority: P3)

Users who forgot their password (or Google users who never set one) request a reset link by email and set a new password via the linked page. Completing a reset revokes all sessions.

**Why this priority**: Recovery aids retention and is the only way a Google-only account adds a password, but it is not required for the initial verified-login MVP.

**Independent Test**: Click "Forgot password?", submit an email, and confirm the same neutral confirmation always shows; open the reset link, set a compliant new password, and confirm success plus that the user must log in again.

**Acceptance Scenarios**:

1. **Given** a user on the login page, **When** they click "Forgot password?", **Then** they navigate to `/forgot-password`
2. **Given** a user on the recovery page, **When** they submit any email, **Then** they always see the same neutral message ("If that email is registered, a reset link has been sent.") regardless of whether the email exists (no account enumeration)
3. **Given** a user who exceeds the forgot-password rate limit (3 per 15 minutes), **When** they submit again, **Then** they see a rate-limit message
4. **Given** a user opening a reset link, **When** `/reset-password?token=...` loads, **Then** the token is immediately removed from the URL/history (kept only for this page's submission) and they can enter a new password (8–72 characters)
5. **Given** a valid, unused reset token, **When** the user submits a new, different password, **Then** the password is changed, all their sessions are revoked, any session held by this browser is cleared, and they are directed to log in again
6. **Given** a reset token that was already used, **When** the user submits, **Then** they see an "already used" message distinct from the "replaced by a newer request" message, and any session held by this browser is cleared (the backend revoked all sessions)
7. **Given** a reset token that has been superseded by a newer request, **When** the user submits, **Then** they see a "this reset link has been replaced by a newer request — check your most recent email" message
8. **Given** an expired reset token, **When** the user submits, **Then** they see a "reset link expired" message
9. ~~**Given** a new password identical to the current one, **When** the user submits, **Then** they see "New password must be different from your current password"~~ Dropped: the backend removed this check on purpose (it acted as a password oracle; see `touch-grass-back/docs/known-gaps.md`) and accepts the current password. The frontend keeps the `RESET_SAME_PASSWORD` mapping in case the check returns.

---

### Edge Cases

- **Backend unreachable / network timeout** during any auth call: show a non-crashing error state with a retry affordance; never a blank screen.
- **Refresh-token rotation**: every successful refresh returns a brand-new token pair and invalidates the old refresh token. For 20 seconds after the rotation the backend answers a repeat of the old token with the same new refresh token (its replay window); after that the old token is dead. The frontend must always persist the newest refresh token and never reuse a prior one outside that window.
- **Concurrent refreshes**: several requests discovering an expired access token at the same moment on one server instance must share a single refresh. Requests on different server instances may each refresh; the backend's replay window gives them all the same new refresh token, so the user stays logged in.
- **Refresh-token reuse / revocation**: if a refresh call returns "revoked" or "already used", the backend may have logged out **all** of the user's sessions; the frontend must clear the session and route to login.
- **Session expired**: a session reaches the backend's absolute lifetime (90 days from the login that started it) and the refresh returns `401 Session expired`; the frontend clears the session and routes to login like any other rejected refresh.
- **Transient refresh failure** (network error, `5xx`, `429`): the session is **not** cleared; the user sees a retryable error. Only a `401` refresh outcome ends the session.
- **Access token invalidated by password reset**: an access token issued before a password reset is rejected even if unexpired; the follow-up refresh also fails (all refresh tokens were revoked), so the user is routed to login.
- **Verification code rejected vs. session rejected**: `verify-email` returns `401` both for code errors and for an invalid session. The two are distinguished by the backend message; a code error is shown inline and is never refreshed-and-retried (a retry would consume a second attempt). If the access token had expired, the first request is rejected as a session failure before the code is checked; the session is refreshed and the code re-sent once, and a code error on that retry is shown inline like any other (it does **not** end the session).
- **Unverified user hitting a protected route**: any `403 Email not verified` from any route routes the user to `/verify-email`.
- **Arriving at `/verify-email` from login or a `403`** (not directly from signup): the resend action starts enabled; if the backend answers with the 60-second cooldown `429`, the button enters cooldown.
- **Already-authenticated user navigating to `/login` or `/register`**: redirect to `/map` (or to `/verify-email` if the session is unverified).
- **Google completion page opened without a token or error param**: treat as a failed sign-in.
- **Rate limit when starting Google sign-in**: if the backend's Google entry point is rate-limited, the backend shows its own plain error page (outside the frontend's control); only the `too_many_requests` code returned to the completion page is handled by the frontend.
- **Malformed API responses**: responses are validated at the boundary; a shape mismatch is handled as an error, not a crash.
- **Concurrent Google callbacks (double-click)**: the backend converges both to one account; the frontend simply completes the single exchange it holds.

## Requirements _(mandatory)_

### Functional Requirements

#### Pages & Routing

- **FR-001**: System MUST provide a login page at `/login` with email and password fields matching the Figma design.
- **FR-002**: System MUST provide a signup page at `/register` with email and password fields (and a password-confirmation field client-side).
- **FR-003**: System MUST provide an email verification screen at `/verify-email` where an authenticated-but-unverified user enters a 6-digit code, with a "Resend code" action.
- **FR-004**: System MUST provide a password recovery page at `/forgot-password` (request reset by email) and a reset page at `/reset-password` that reads the reset token from the link URL (path fixed by the backend's reset-link format).
- **FR-005**: System MUST provide a Google OAuth completion page at `/oauth/complete` that reads `token` or `error` from the URL query (path fixed by the backend's redirect target).
- **FR-006**: System MUST assign each route introduced by this feature to an access tier mirroring the backend:

  | Route                       | Tier               | Behavior when tier not met                                | Justification for looser-than-default tier                                        |
  | --------------------------- | ------------------ | --------------------------------------------------------- | --------------------------------------------------------------------------------- |
  | `/login`                    | Public             | Authenticated → `/map` (or `/verify-email` if unverified) | Entry point for signed-out users                                                  |
  | `/register`                 | Public             | Authenticated → `/map` (or `/verify-email` if unverified) | Entry point for new users                                                         |
  | `/forgot-password`          | Public             | —                                                         | Users who cannot log in must reach it                                             |
  | `/reset-password`           | Public             | —                                                         | Reached from an emailed link, possibly with no session                            |
  | `/oauth/complete`           | Public             | —                                                         | Backend redirects here before any session exists                                  |
  | `/session-unavailable`      | Public             | — (proxy rewrite target; never linked)                    | Proxy fallback when the session can't be checked; a session check here would loop |
  | `/verify-email`             | Unverified         | No session → `/login`; already verified → `/map`          | Unverified users must reach it; mirrors backend `AllowUnverified`                 |
  | `/map` and all other routes | Verified (default) | No session → `/login`; unverified → `/verify-email`       | —                                                                                 |

- **FR-007**: System MUST redirect to `/map` after login/signup/verification/Google exchange only once the session is authenticated **and** the email is verified; an authenticated-but-unverified session MUST instead land on `/verify-email`.
- **FR-008**: System MUST provide a "Sign up" link on the login page (→ `/register`), a "Log in" link on the signup page (→ `/login`), and a "Forgot password?" link on the login page (→ `/forgot-password`).

#### Session & Token Handling

- **FR-009**: System MUST treat a successful authentication as returning an opaque `{ accessToken, refreshToken }` pair and MUST store both only in a server-held session (cookies set by the frontend's server side, not readable by browser scripts). Tokens MUST NEVER be returned to, stored in, or readable by browser JavaScript.
- **FR-010**: System MUST make all authenticated backend calls through the frontend's server side, which attaches the access token; the access token MUST be treated as opaque (no decoding of claims). User identity and verification state come exclusively from the backend's current-user endpoint.
- **FR-011**: System MUST refresh the session by exchanging the current refresh token, MUST persist the newly returned pair immediately, and MUST discard the previous refresh token (single-use rotation).
- **FR-012**: System MUST ensure only one refresh is in flight per session on each server instance; concurrent requests on that instance needing a refresh MUST share that single refresh. Refreshes of the same session on different server instances rely on the backend's 20-second replay window, which returns the same new refresh token to each of them.
- **FR-013**: System MUST, when a protected request fails due to a missing/expired/invalidated access token, refresh once and retry the request once; if the refresh fails with a `401` (revoked, already used, expired, invalid, or session expired), it MUST clear the session and route the user to `/login`. Transient refresh failures (network, `5xx`, `429`) MUST NOT clear the session.
- **FR-014**: System MUST NOT apply refresh-and-retry to requests whose `401` describes a business outcome rather than an invalid session — in particular verification-code errors (which would consume another attempt) and public auth endpoints (login, reset, Google exchange).
- **FR-015**: System MUST support logout by sending the stored refresh token to the backend and clearing the session regardless of the response.

#### Email Verification

- **FR-016**: System MUST have the backend evaluate the 6-digit code at most once per user submission and, on success, proceed to `/map` **without** re-login or token refresh. A session `401` (missing/expired access token) is rejected before the backend checks the code, so it may be refreshed and retried once (FR-013); a code error is never retried (FR-014).
- **FR-017**: System MUST accept exactly 6 numeric digits for the code, preserving leading zeros, and MUST validate this client-side before submission.
- **FR-018**: System MUST surface the distinct verification failure states to the user: invalid code (attempt consumed), expired code, no active code, and attempts-exhausted — the last three prompting a resend.
- **FR-019**: System MUST provide a "Resend code" action that is disabled for a 60-second cooldown after a code is sent — including on arrival from signup, since signup just sent a code — and MUST surface the "please wait" (`429`) and email-send-failure (`503`) states, entering cooldown in both cases.
- **FR-020**: System MUST, on receiving `403 Email not verified` from any protected route, route the user to `/verify-email`.
- **FR-021**: System MUST read the current user's verification state (`id`, `email`, `emailVerified`) after login/Google exchange to decide between `/verify-email` and `/map`. This profile is the only session data visible to the browser.

#### Google OAuth

- **FR-022**: System MUST initiate Google sign-in by performing a full-page browser navigation directly to the backend Google entry point — never a background request and never through the frontend's server proxy.
- **FR-023**: System MUST keep the handoff token out of the address bar and browser history: the server moves it into a short-lived, page-scoped HttpOnly cookie and redirects to the bare completion URL before the page renders.
- **FR-024**: System MUST exchange the single-use handoff token for a real token pair on the frontend's server side, storing the result in the server-held session, exactly once — guarding against duplicate execution (e.g., React strict-mode double effects).
- **FR-025**: System MUST map each backend error code (`access_denied`, `email_already_in_use`, `too_many_requests`, `oauth_failed`), the missing-token case, and any exchange failure to a clear, user-facing message with a retry path.
- **FR-026**: System MUST render a single "Continue with Google" action on both login and signup. GitHub and Discord options MUST NOT be shown, as the backend supports only Google.

#### Password Recovery & Reset

- **FR-027**: System MUST always display the same neutral confirmation after a forgot-password request, regardless of whether the email exists.
- **FR-028**: System MUST read the reset token from the reset link URL, immediately remove it from the URL and browser history, and submit it with a new password (8–72 characters) to the backend.
- **FR-029**: System MUST distinguish and display the reset outcomes: success (then direct to login), invalid token, expired token, already-used token, replaced-by-newer-request token, and "new password must differ."
- **FR-030**: System MUST communicate that a successful reset ends all sessions and MUST clear any session held by this browser after a successful reset or an "already used" outcome.

#### Validation, Errors, Forms & UX

- **FR-031**: System MUST validate email format and required fields client-side before allowing submission, displaying field-level errors inline.
- **FR-032**: System MUST validate password length as 8–72 characters client-side to match backend policy. (The backend enforces only length; the frontend MUST NOT impose stricter composition rules that would reject a backend-valid password.)
- **FR-033**: System MUST prevent submission while client-side validation errors exist.
- **FR-034**: System MUST implement forms using React Hook Form and validate all inputs with Zod schemas _(constitution-mandated)_.
- **FR-035**: System MUST validate all backend responses at the data boundary with Zod schemas before use, deriving types from those schemas _(constitution-mandated)_.
- **FR-036**: System MUST parse the standard backend error shape (`{ statusCode, message, error }`, where `message` is an array of strings for validation errors) and present user-friendly messages, never raw payloads.
- **FR-037**: System MUST surface every rate-limit response (`429`) as a clear, non-blocking message: "Too many attempts, please wait a moment" on login and code entry (short per-minute limits); the Google-specific rate-limit message on the Google exchange and the `too_many_requests` completion code; and "Too many requests, please try again later" on every other flow, including signup, forgot-password, reset-password, and resend-verification (whose 60-second cooldown keeps its own message, FR-019). `503` responses MUST show a friendly "try again later" message. A `429` while refreshing the session or reading the current user is a transient failure (FR-013), not a message.
- **FR-038**: System MUST show loading states (disabled submit, spinner) during every auth request and MUST NOT show blank screens during fetches.
- **FR-039**: System MUST wrap all auth API calls in error handling so external failures never crash the UI.

#### Architecture & Design _(constitution-mandated)_

- **FR-040**: System MUST match the Figma design layout, typography (Manrope for headings, Hanken Grotesk for body), spacing, and color scheme. Where a Figma color fails WCAG AA contrast _(constitution-mandated)_, the nearest passing color is used instead, and each such deviation is listed under Assumptions.
- **FR-041**: System MUST follow FSD: Next.js routes in `app/` (thin wrappers), page composites in `src/_pages/*`, auth interactions in `src/features/auth`, the user/session domain in `src/entities/*`, and shared UI in `@/shared/ui/` (flat), with downward-only imports and per-slice `index.ts` public APIs.
- **FR-042**: System MUST install any missing shadcn/ui primitives (input, button, form, label, and an OTP/segmented input if used) via `npx shadcn@latest add <component>` into `@/shared/ui/` before building the forms.

### Key Entities _(include if feature involves data)_

- **Session Token Pair**: An opaque `accessToken` (short-lived, sent as `Bearer` by the frontend's server side) and an opaque `refreshToken` (single-use, rotates on every refresh). Held only in the server-held session, never visible to browser scripts. The newest refresh token supersedes all prior ones; a refresh token reused outside the backend's 20-second replay window invalidates all sessions.
- **Current User**: `{ id, email, emailVerified }` — the minimal profile used to decide between `/verify-email` and `/map`; the only session data visible to the browser.
- **Verification Code State**: A 6-digit code with a short lifetime, at most 5 attempts, one active code at a time, and a 60-second resend cooldown (all enforced by the backend; the frontend reflects the resulting states).
- **OAuth Handoff Token**: A single-use, short-lived token delivered on the completion page URL, exchanged once for a token pair, and stripped from history immediately.
- **Password Reset Token**: A single-use token carried in the reset link URL, exchanged for a password change; its outcomes (used/replaced/expired/invalid) are distinct user-facing states.
- **Form Validation State**: Client-side field errors and submission status (idle/submitting/error/success).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A verified user can go from the login page to the map view in under 10 seconds (excluding Google redirects).
- **SC-002**: A new user can complete signup and email verification and reach the map view in under 90 seconds, assuming the code email arrives promptly.
- **SC-003**: Users see field-level validation feedback within 300 ms of leaving an invalid input.
- **SC-004**: 95% of login/signup attempts with valid credentials succeed on the first try without client-side errors.
- **SC-005**: Every backend authentication state documented in the API (invalid credentials, unverified email, rate limits, verification-code failures, refresh rotation/reuse, and all Google and reset error codes) maps to a distinct, understandable user-facing outcome — verified by walking each state.
- **SC-006**: 100% of successful refreshes result in the newest token pair being persisted and the old refresh token discarded, with no reuse of a rotated token outside the backend's 20-second replay window — including when many requests need a refresh at the same moment, and none of them logs the user out.
- **SC-007**: The Google handoff token is exchanged exactly once, and neither the handoff token nor the reset token remains in the browser URL/history after its page settles.
- **SC-010**: Session tokens are never readable by browser scripts on any page — verified by inspecting browser-accessible storage and script-readable cookies after login, signup, and Google sign-in.
- **SC-011**: A wrong verification code consumes exactly one of the 5 attempts per submission.
- **SC-008**: The forgot-password confirmation is byte-for-byte identical whether or not the email exists (no enumeration signal).
- **SC-009**: The login page is pixel-accurate to Figma node `1:2`, apart from the Figma deviations listed under Assumptions. The signup page matches the login layout (same split screen, spacing, typography, and component styling) with its own copy and fields. Both have zero layout shift during loading.

## Assumptions

- The backend base URL is provided to the frontend via environment configuration and validated at the boundary; secrets stay server-side. The public API base URL is exposed to the browser only so it can navigate to the Google entry point; it is not a secret.
- Per the constitution, the frontend's server side acts as a Backend-for-Frontend: it proxies backend calls and owns the session cookies. The exact mechanism (route handlers, server actions, middleware) is deferred to planning; the spec requires only that tokens never reach browser scripts, the newest refresh token always wins, refreshes are single-flight on each server instance (the backend's replay window covers the rest), and the session is cleared on logout/revocation.
- **Dependency (open, constitution TODO `BACKEND_RATE_LIMIT_IP`)**: backend rate limits are per client IP. Behind the Backend-for-Frontend every request originates from the frontend server, so all users would share one limit (e.g., 10 logins/minute globally). Before production the backend MUST trust the proxy and derive the client IP from `X-Forwarded-For`, and the frontend server MUST forward it.
- The signup form includes a client-side password-confirmation field for usability even though the backend accepts only `email` and `password`.
- There is no signup frame in Figma. Until one exists, the signup page reuses the login layout as-is (image on the left, form on the right, same `AuthShell`), with the heading **"Join Touch Grass"** and the subtitle **"Create an account to start your journey."** (login uses "Welcome to Touch Grass" / "Sign in to continue your journey.").
- The Google completion route path is `/oauth/complete`, matching the backend's configured `FRONTEND_URL` redirect target. Because the handoff-token exchange is performed server-side, it does not depend on the backend's `CORS_ORIGINS`.
- The verification and recovery pages use `/verify-email` and `/forgot-password`; these paths are a frontend choice, not dictated by the backend.
- Password reset links point at a frontend reset page carrying the token as a query parameter (`/reset-password?token=...`), matching the backend link format.
- The frontend does not render GitHub or Discord sign-in options because the backend implements only Google; reintroducing them requires backend support first.
- A completed password reset does not currently mark the email verified (per the backend's known gaps); a Google-only user who adds a password via reset may still need to verify email through the normal flow if their account was unverified.
- Form accessibility (keyboard navigation, screen-reader labels, ARIA) is provided via shadcn/ui form primitives and WCAG AA contrast per the constitution.
- **Figma deviations** (the only allowed differences under FR-040 and SC-009):
  - One full-width "Continue with Google" button replaces the three provider icons (FR-026).
  - Accessibility colors (WCAG AA, constitution X): input and code-entry borders use `#888c88` instead of `#c2c8c3` (1.6:1 → 3.2:1 against the page), placeholder text uses `#646b78` instead of `#6b7280` (4.4:1 → 4.8:1 on the input fill), and the keyboard focus ring uses the primary color `#1a3026` (13:1). Decorative lines keep `#c2c8c3`.
- Mobile-first responsive design hides the left-side image panel on small screens per the Figma layer naming.
