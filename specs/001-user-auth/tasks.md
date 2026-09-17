<!--
  ============================================================================
  IMPLEMENTATION TASKS
  Feature: 001-user-auth
  Generated: 2026-09-17
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create feature slice directories (`src/features/auth`, `src/entities/auth`, `src/_pages/login`, `src/_pages/register`, `src/_pages/forgot-password`, `src/_pages/reset-password`, `src/_pages/check-email`, `src/shared/api`, `src/shared/config`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 [P] Create API Response schemas in `src/entities/auth/model/schema.ts` (with `src/entities/auth/model/schema.test.ts`) and export in `src/entities/auth/index.ts`
- [ ] T003 [P] Create Form input schemas in `src/features/auth/model/schemas.ts` (with `src/features/auth/model/schemas.test.ts`)
- [ ] T004 [P] Create shared types (e.g. ActionResult) in `src/features/auth/model/types.ts`
- [ ] T005 [P] Create route constants in `src/shared/config/routes.ts`
- [ ] T006 [P] Write tests for API client in `src/shared/api/client.test.ts`
- [ ] T007 Implement shared API client wrapper in `src/shared/api/client.ts`
- [ ] T008 [P] Write tests for session cookie helpers in `src/shared/api/session.test.ts`
- [ ] T009 Implement session cookie helpers in `src/shared/api/session.ts`
- [ ] T010 [P] Write tests for route protection middleware in `proxy.test.ts`
- [ ] T011 Implement Next.js route protection middleware in `proxy.ts`
- [ ] T012 [P] Write tests for PasswordField in `src/features/auth/ui/password-field.test.tsx`
- [ ] T013 [P] Implement PasswordField UI component in `src/features/auth/ui/password-field.tsx`
- [ ] T014 [P] Write tests for SocialPlaceholder in `src/features/auth/ui/social-placeholder.test.tsx`
- [ ] T015 [P] Implement SocialPlaceholder UI component in `src/features/auth/ui/social-placeholder.tsx`
- [ ] T016 Create public barrel for auth feature in `src/features/auth/index.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Email/Password Login (Priority: P1) 🎯 MVP

**Goal**: A returning user lands on the login page, enters their registered email address and password, and is granted access to the authenticated area.

**Independent Test**: Scenario 1 in quickstart.md (Successful Login), Scenario 2 (Invalid Credentials), Scenario 9 (Logout).

### Tests for User Story 1 (REQUIRED TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T017 [P] [US1] Write test for login server action in `src/features/auth/api/actions.test.ts`
- [ ] T018 [P] [US1] Write test for LoginForm in `src/features/auth/ui/login-form.test.tsx`
- [ ] T019 [P] [US1] Write test for LoginPage in `src/_pages/login/ui/login-page.test.tsx`

### Implementation for User Story 1

- [ ] T020 [US1] Implement login & logout Server Actions in `src/features/auth/api/actions.ts`
- [ ] T021 [US1] Implement LoginForm component in `src/features/auth/ui/login-form.tsx`
- [ ] T022 [US1] Implement LoginPage composite in `src/_pages/login/ui/login-page.tsx` and barrel `src/_pages/login/index.ts`
- [ ] T023 [P] [US1] Create thin wrapper route in `app/login/page.tsx`
- [ ] T024 [P] [US1] Implement root home route `app/page.tsx` to redirect based on auth state

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - New Account Registration (Priority: P2)

**Goal**: A new visitor clicks "Sign up" from the Login page, fills in their details, and creates a new account.

**Independent Test**: Scenario 4 in quickstart.md (Registration gate), Scenario 14 (Duplicate email).

### Tests for User Story 2 (REQUIRED TDD) ⚠️

- [ ] T025 [P] [US2] Write test for register server action in `src/features/auth/api/actions.test.ts`
- [ ] T026 [P] [US2] Write test for RegisterForm in `src/features/auth/ui/register-form.test.tsx`
- [ ] T027 [P] [US2] Write test for RegisterPage in `src/_pages/register/ui/register-page.test.tsx`

### Implementation for User Story 2

- [ ] T028 [US2] Implement register Server Action in `src/features/auth/api/actions.ts`
- [ ] T029 [US2] Implement RegisterForm component in `src/features/auth/ui/register-form.tsx`
- [ ] T030 [US2] Implement RegisterPage composite in `src/_pages/register/ui/register-page.tsx` and barrel `src/_pages/register/index.ts`
- [ ] T031 [US2] Create thin wrapper route in `app/register/page.tsx`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 4 - Email Address Verification (Priority: P2)

**Goal**: After registering, a new user receives a verification email and must confirm their address before gaining access to any authenticated page.

**Independent Test**: Scenario 4 (Verification Link Flow), Scenario 5 (Unverified Session Gate), Scenario 6 (Resend Email).

### Tests for User Story 4 (REQUIRED TDD) ⚠️

- [ ] T032 [P] [US4] Write test for verify/resend server actions in `src/features/auth/api/actions.test.ts`
- [ ] T033 [P] [US4] Write test for CheckEmailPage in `src/_pages/check-email/ui/check-email-page.test.tsx`

### Implementation for User Story 4

- [ ] T034 [US4] Implement verifyEmail & resendVerificationEmail Server Actions in `src/features/auth/api/actions.ts`
- [ ] T035 [US4] Implement CheckEmailPage composite in `src/_pages/check-email/ui/check-email-page.tsx` (includes resend logic) and barrel `src/_pages/check-email/index.ts`
- [ ] T036 [US4] Create thin wrapper route in `app/check-email/page.tsx`

**Checkpoint**: Registration flow is now fully gated by email verification

---

## Phase 6: User Story 3 - Password Recovery (Priority: P3)

**Goal**: A user who has forgotten their password requests a recovery link, receives it by email, and uses it to set a new password.

**Independent Test**: Scenario 7 in quickstart.md (Password Recovery Full Flow), Scenario 8 (Expired Reset Link).

### Tests for User Story 3 (REQUIRED TDD) ⚠️

- [ ] T037 [P] [US3] Write test for forgot/reset server actions in `src/features/auth/api/actions.test.ts`
- [ ] T038 [P] [US3] Write test for ForgotPasswordForm in `src/features/auth/ui/forgot-password-form.test.tsx`
- [ ] T039 [P] [US3] Write test for ResetPasswordForm in `src/features/auth/ui/reset-password-form.test.tsx`
- [ ] T040 [P] [US3] Write test for ForgotPasswordPage in `src/_pages/forgot-password/ui/forgot-password-page.test.tsx`
- [ ] T041 [P] [US3] Write test for ResetPasswordPage in `src/_pages/reset-password/ui/reset-password-page.test.tsx`

### Implementation for User Story 3

- [ ] T042 [US3] Implement forgotPassword & resetPassword Server Actions in `src/features/auth/api/actions.ts`
- [ ] T043 [P] [US3] Implement ForgotPasswordForm component in `src/features/auth/ui/forgot-password-form.tsx`
- [ ] T044 [P] [US3] Implement ResetPasswordForm component in `src/features/auth/ui/reset-password-form.tsx`
- [ ] T045 [P] [US3] Implement ForgotPasswordPage composite in `src/_pages/forgot-password/ui/forgot-password-page.tsx` and barrel `src/_pages/forgot-password/index.ts`
- [ ] T046 [P] [US3] Implement ResetPasswordPage composite in `src/_pages/reset-password/ui/reset-password-page.tsx` and barrel `src/_pages/reset-password/index.ts`
- [ ] T047 [US3] Create thin wrapper route in `app/forgot-password/page.tsx`
- [ ] T048 [US3] Create thin wrapper route in `app/reset-password/page.tsx`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T049 Run quickstart.md validation testing scenarios manually
- [ ] T050 [P] Fix any remaining accessibility and styling issues (WCAG AA check)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - Sequential priority order (P1 → P2 → P3) or can be executed in parallel (US1, US2, US3)
- **Polish (Final Phase)**: Depends on all user stories being complete

### Parallel Opportunities

- Within Phase 2, schema creation, config/routes creation, API client tests, middleware tests, and standalone UI components (PasswordField, SocialPlaceholder) can be worked on in parallel.
- Within User Stories, UI tests and forms can be built in parallel with Server Action tests.
- Thin `app/` wrappers can be created in parallel with composite `_pages` components.
