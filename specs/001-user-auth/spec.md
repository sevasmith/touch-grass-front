# Feature Specification: User Authentication

**Feature Branch**: `001-user-auth`

**Created**: 2026-09-15

**Status**: Draft

**Input**: User description: "Build the User Authentication module for Touch Grass. Users need
standard email/password registration, login, and password recovery. Do not use Auth0 or
third-party providers. Requirements derived from Figma design (node 0-1, file xDvS7vVu6JmMLjG1J27idD)."

---

## Clarifications

### Session 2026-09-16

- Q: Should the system enforce rate-limiting or a lockout policy to protect login and password-recovery endpoints against brute-force attacks? → A: Temporary account lockout after 5 consecutive failed login attempts; locked account is released after 15 minutes.
- Q: Does the system need to verify a new user's email address before granting full access to the authenticated area? → A: Hard gate — users must verify their email before accessing any authenticated route; unverified sessions are redirected to a "check your email" holding page.
- Q: When a user is done using the app, should there be an explicit logout action that destroys their session, and should sessions expire automatically after a period of inactivity? → A: Explicit logout only — clicking "Log out" destroys the session; sessions otherwise live for 7 days (no inactivity expiry in v1).
- Q: Should the password input fields include a show/hide toggle so users can reveal the characters they are typing? → A: Yes — all password fields (login, register, confirm-password, reset) include a show/hide toggle icon switching between masked and plain-text display.
- Q: If the external email service fails to send a password-recovery or verification email, how should the system handle the failure in the UI? → A: Fail the entire action, show a generic error ("Please try again later"), and do not create the account if it was a registration attempt.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Email/Password Login (Priority: P1)

A returning user lands on the login page, enters their registered email address and password, and
is granted access to the authenticated area of the application.

**Why this priority**: Login is the primary gate to all protected functionality. Without it, no
other authenticated feature is reachable.

**Independent Test**: Can be fully tested by creating a user in the data store, navigating to
`/login`, submitting valid credentials, and verifying redirection to the authenticated home route.

**Acceptance Scenarios**:

1. **Given** a user with a registered account is on the Login page,
   **When** they enter a valid email and correct password and click "Log In",
   **Then** they are redirected to the authenticated dashboard and their session is established.

2. **Given** a user on the Login page,
   **When** they enter a valid email but an incorrect password and click "Log In",
   **Then** an inline error message is displayed (e.g., "Invalid email or password") and they
   remain on the Login page.

3. **Given** a user on the Login page,
   **When** they submit the form with either field empty,
   **Then** field-level validation errors appear before any network request is made.

4. **Given** a user on the Login page,
   **When** they click "Forgot password?",
   **Then** they are navigated to the Password Recovery flow.

5. **Given** a user on the Login page,
   **When** they click "Sign up",
   **Then** they are navigated to the Registration flow.

6. **Given** a user on the Login page on a mobile device,
   **When** the page loads,
   **Then** the decorative left-panel image is hidden and the login form occupies the full viewport width.

7. **Given** an authenticated user,
   **When** they trigger the "Log out" action,
   **Then** their session is immediately destroyed server-side, any session cookie is cleared,
   and they are redirected to the Login page.

---

### User Story 2 — New Account Registration (Priority: P2)

A new visitor clicks "Sign up" from the Login page, fills in their details, and creates a
new account, after which they are automatically signed in.

**Why this priority**: Registration is required before a user can ever log in. However, login
is higher priority because most interactions involve returning users, and registration only
happens once per user.

**Independent Test**: Can be fully tested by navigating to `/register`, submitting valid new-user
credentials, and verifying a new account record exists and the user is redirected as authenticated.

**Acceptance Scenarios**:

1. **Given** a visitor on the Registration page,
   **When** they enter a valid email, a strong password, and confirm the password correctly,
   and submit the form,
   **Then** a new account is created, the user is automatically signed in, and they are
   redirected to the authenticated dashboard.

2. **Given** a visitor on the Registration page,
   **When** they enter an email address that is already associated with an existing account,
   **Then** an error message is displayed (e.g., "An account with this email already exists")
   and registration is blocked.

3. **Given** a visitor on the Registration page,
   **When** they enter a password that does not meet the minimum strength requirements,
   **Then** a field-level validation error explains the requirement before the form is submitted.

4. **Given** a visitor on the Registration page,
   **When** they enter a confirmation password that does not match the primary password field,
   **Then** a field-level validation error is shown on the confirmation field.

5. **Given** a visitor on the Registration page,
   **When** they submit with any required field empty,
   **Then** field-level validation errors appear without making a network request.

---

### User Story 3 — Password Recovery (Priority: P3)

A user who has forgotten their password requests a recovery link, receives it by email, and
uses it to set a new password.

**Why this priority**: Password recovery is essential for user retention but is not a
day-to-day path. It is lower priority than login and registration.

**Independent Test**: Can be fully tested by simulating the "Forgot password?" flow: submitting
an email on the recovery page, inspecting the generated reset token, navigating to the reset
URL, and verifying a new password is accepted on subsequent login.

**Acceptance Scenarios**:

1. **Given** a user on the Password Recovery page,
   **When** they enter the email address of a registered account and submit,
   **Then** a password-reset email is dispatched to that address and a confirmation message
   is shown (e.g., "Check your email for a reset link").

2. **Given** a user on the Password Recovery page,
   **When** they enter an email address that does not correspond to any account and submit,
   **Then** the same neutral confirmation message is shown (to prevent email enumeration attacks)
   and no email is sent.

3. **Given** a user who has received a reset-link email and clicks the link within its validity window,
   **When** they enter and confirm a new valid password on the Reset Password page,
   **Then** their password is updated and they are automatically signed in and redirected to
   the authenticated dashboard.

4. **Given** a user who clicks a password-reset link after it has expired or been already used,
   **When** the Reset Password page loads,
   **Then** an error message is displayed (e.g., "This link has expired. Please request a new one.")
   and a prompt to request a fresh link is shown.

5. **Given** a user on the Reset Password page,
   **When** they enter a new password that does not meet the minimum strength requirements,
   **Then** field-level validation blocks submission and explains the requirement.

---

### User Story 4 — Email Address Verification (Priority: P2)

After registering, a new user receives a verification email and must confirm their address before
gaining access to any authenticated page.

**Why this priority**: This is an extension of the registration flow. Without it the
`email_verified` flag has no enforcement path, and unverified accounts can access protected routes
— contradicting the hard-gate decision.

**Independent Test**: Can be fully tested by registering a new account, inspecting the generated
verification token, visiting the verification link, and confirming the user is then admitted to the
authenticated dashboard.

**Acceptance Scenarios**:

1. **Given** a user who has just registered,
   **When** they are redirected after form submission,
   **Then** they land on a "Check your email" holding page that explains a verification link has
   been sent and they cannot proceed until they verify.

2. **Given** an unverified user who tries to access any authenticated route directly,
   **When** the system checks their session,
   **Then** they are redirected to the "Check your email" holding page, not to login.

3. **Given** a user on the "Check your email" holding page,
   **When** they click "Resend verification email",
   **Then** a new verification email is dispatched and a confirmation message is shown; the
   resend action is rate-limited to prevent abuse.

4. **Given** a user who clicks their verification link within its validity window,
   **When** the link is processed,
   **Then** their account is marked verified, they are automatically admitted to the authenticated
   dashboard, and the link is invalidated for future use.

5. **Given** a user who clicks a verification link that has expired or already been used,
   **When** the link is processed,
   **Then** an error page is shown with an option to request a new verification email.

---

### Edge Cases

- What happens when a user submits the login form while already authenticated? They must be
  redirected to the authenticated dashboard without re-processing credentials.
- What happens when the back-end is temporarily unavailable during form submission? The system
  must display a user-friendly error message and allow the user to retry without losing their
  entered data.
- What happens when a password-reset token is tampered with or malformed in the URL? The
  system must reject it with a clear error and not expose any sensitive information.
- What happens when a user attempts to register with an email containing leading/trailing
  whitespace? The system must normalise the email (trim) before validation and storage.
- What happens when the "Log In" button is clicked multiple times in rapid succession? Duplicate
  submission must be prevented (button disabled on first click until a response is received).
- What happens when a user reaches the 5-consecutive-failure threshold? The account must be locked
  for exactly 15 minutes; the error message must state the lock duration without revealing whether
  it was the 5th or nth attempt.
- What happens if the external transactional email service fails (e.g., timeout or API error) during
  registration or password recovery? The system must fail the action gracefully, display a generic
  error message instructing the user to try again later, and (in the case of registration) roll back/abort
  the account creation to prevent orphaned unverified accounts.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide a Login page accessible at a dedicated route (e.g., `/login`)
  that is reachable by unauthenticated users.
- **FR-002**: The Login page MUST present an email input field, a password input field, a
  "Forgot password?" link, a primary "Log In" action, and a "Sign up" navigation link.
- **FR-003**: The Login page MUST display the "Touch Grass" brand wordmark on a decorative
  left panel that is visible on tablet and desktop viewports but hidden on mobile.
- **FR-004**: The system MUST validate the email and password fields client-side before making
  a network request; both fields are required.
- **FR-005**: The system MUST authenticate the user with email/password credentials against
  stored account records and establish a secure session upon success.
- **FR-006**: The system MUST display a non-specific error message (e.g., "Invalid email or
  password") on credential mismatch to avoid exposing whether the email exists.
- **FR-007**: The system MUST provide a Registration page accessible at a dedicated route
  (e.g., `/register`) for new visitors.
- **FR-008**: The Registration page MUST collect at minimum: email address, password, and
  password confirmation.
- **FR-009**: The system MUST enforce a minimum password strength policy and communicate
  requirements clearly via field-level validation.
- **FR-010**: The system MUST prevent registration with a duplicate email address and display
  an appropriate error.
- **FR-011**: Upon successful registration, the system MUST automatically sign the user in
  and redirect them to the authenticated area.
- **FR-012**: The system MUST provide a Password Recovery page where users can submit their
  email to receive a reset link.
- **FR-013**: Password-recovery confirmation messages MUST be identical whether or not the
  email is registered, to prevent account enumeration.
- **FR-014**: Password-reset links MUST have a defined expiry window (e.g., 1 hour) and be
  invalidated after single use.
- **FR-015**: The Reset Password page MUST allow users to set a new password and confirm it,
  subject to the same strength policy as registration.
- **FR-016**: All authentication routes MUST redirect already-authenticated users away to the
  dashboard.
- **FR-017**: All forms MUST prevent duplicate submission (submit button disabled after first
  click, re-enabled on failure).
- **FR-018**: The Login page footer MUST include links to Privacy Policy, Terms of Service,
  and Contact pages.
- **FR-019**: All input fields MUST include appropriate `aria-label` or visible labels and
  support full keyboard navigation.
- **FR-020**: All form errors MUST be announced to screen readers (live region or focus management).
- **FR-021**: The system MUST lock an account for 15 minutes after 5 consecutive failed login
  attempts from any source. The user MUST be shown a clear message indicating the lock and the
  duration remaining. The lockout counter MUST reset upon a successful login.
- **FR-022**: Upon successful registration, the system MUST dispatch a verification email
  containing a single-use link before admitting the user to any authenticated route. The user
  MUST be redirected to a "Check your email" holding page.
- **FR-023**: Any session belonging to an unverified account that attempts to access a protected
  route MUST be redirected to the "Check your email" holding page. Only the resend action and
  logout are permitted from this state.
- **FR-024**: Email verification links MUST expire after 24 hours and be invalidated after a
  single successful use. The "Check your email" page MUST offer a rate-limited "Resend verification
  email" action.
- **FR-025**: The system MUST provide an explicit "Log out" action accessible to authenticated
  users. On activation it MUST immediately invalidate the server-side session record and clear
  the session cookie, then redirect the user to the Login page. Sessions with no explicit logout
  persist for 7 days from creation (no inactivity expiry in v1).
- **FR-026**: Every password input field (login, registration primary password, registration
  confirm-password, reset-password, and confirm reset-password) MUST include a show/hide toggle
  control. Activating the toggle switches the field between masked (`type="password"`) and
  plain-text (`type="text"`) display. The toggle MUST be keyboard-accessible and carry an
  appropriate `aria-label` that reflects the current state (e.g., "Show password" / "Hide
  password").

### Key Entities

_(Note: Because this is a frontend-only repository, these entities describe the business domain handled by the external backend API. The frontend only interacts with these concepts via API Data Transfer Objects (DTOs) and session cookies, and is not responsible for their database persistence or internal hashing)._

- **User Account**: Represents a registered user. Key attributes: unique email address
  (normalised), hashed password, account creation timestamp, `email_verified` flag (MUST be
  `true` before the account can access any protected route), failed-login attempt counter,
  lockout-expiry timestamp.
- **Session**: Represents an authenticated browser session. Key attributes: session identifier,
  associated user, creation timestamp, expiry timestamp (7 days from creation), creation IP
  (for audit). A session MUST be immediately invalidated on explicit logout.
- **Password Reset Token**: A short-lived, single-use token tied to a user account. Key
  attributes: token value (hashed), associated user, expiry timestamp (1 hour), used flag.
- **Email Verification Token**: A single-use token sent to a new user's email address. Key
  attributes: token value (hashed), associated user, expiry timestamp (24 hours), used flag.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A new user can complete account registration in under 90 seconds on a standard
  connection.
- **SC-002**: A returning user can complete login in under 30 seconds on a standard connection.
- **SC-003**: A user who has forgotten their password can regain access within 5 minutes of
  initiating the password-recovery flow (assuming timely email delivery).
- **SC-004**: 100% of form submission errors surface to the user with a descriptive message;
  zero silent failures or blank error states.
- **SC-005**: The login and registration forms are fully operable via keyboard alone — no
  mouse interaction required to complete any flow.
- **SC-006**: All interactive authentication UI elements achieve a minimum WCAG AA colour
  contrast ratio of 4.5:1.
- **SC-007**: On a viewport narrower than 768 px, the decorative left panel is not rendered,
  and the form remains fully functional and visually complete.

---

## Assumptions

- The Figma file (node `0-1`) contains a single Login screen. Registration and Password Recovery
  screens are not present in the Figma; their layout and field structure follow the same
  two-column design language and form patterns established by the Login screen.
- **Social login buttons (Google, GitHub, Discord)** are visible in the Figma Login screen's
  "or continue with" section. Per the user's explicit directive ("Do not use Auth0 or third-party
  providers"), these buttons are **excluded from scope** for this specification. They may be
  retained in the UI as non-functional placeholders if the user intends to add OAuth later,
  but they MUST NOT wire up any third-party authentication flow.

  **Resolved (2026-09-15):** The social login buttons (Google, GitHub, Discord) visible in the
  Figma design MUST be rendered in the UI as visually disabled placeholders with a "Coming soon"
  label or tooltip. They MUST NOT trigger any authentication flow or call any third-party
  provider. This preserves the Figma design aesthetic while making the non-functional status
  explicit to users.

- Session management uses secure, HTTP-only cookies. Token/cookie expiry defaults to 7 days
  for persistent sessions ("remember me" not in scope for v1).
- Password reset emails are sent via a configured transactional email service (provider to be
  determined at implementation time; credentials supplied via environment variables). Email
  delivery SLA is outside the scope of this feature.
- The minimum password strength policy is: at least 8 characters. More advanced entropy checks
  are out of scope for v1.
- The authenticated redirect destination after login/registration is the application's main
  dashboard route.
- Mobile breakpoint is defined as viewports narrower than 768 px, consistent with the Tailwind
  `md` breakpoint.
