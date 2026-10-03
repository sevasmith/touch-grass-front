# Remaining Work: 001-auth-login-signup

**Status on 2026-10-03**: 140 of 142 tasks in [tasks.md](./tasks.md) are done and committed on
branch `feat/login-page`, which has not been pushed yet. Every automated check passes: 584 tests,
typecheck, lint, build, coverage (98%), Prettier, and fallow.

Two tasks are still open, and both need a person: **T127** (manual testing against the real
backend) and **T008a** (Vercel setup). This guide walks through them in order. When both are done,
tick them in `tasks.md` (`- [ ]` → `- [X]`) and the `/speckit-implement` step is complete.

---

## Step 1: Give the frontend its backend address (2 minutes)

The app needs to know where the backend is. Without this, `pnpm dev`, `pnpm build`, and the
pre-push hook (which runs `pnpm build`) all fail.

In the `touch-grass` folder, run:

```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:6767" > .env.local
```

`.env.local` is ignored by git on purpose, so every developer creates their own.

## Step 2: Start the backend locally

The backend is the separate `touch-grass-back` repository (NestJS + Postgres). Follow that
repository's README to install it and start Postgres, then:

1. In the backend's `.env`, set:

   ```bash
   FRONTEND_URL=http://localhost:3000
   GOOGLE_CALLBACK_URL=http://localhost:6767/auth/google/callback
   # Short lifetimes make the tests below quicker:
   JWT_ACCESS_TTL=1m
   OAUTH_LOGIN_TOKEN_TTL=60s
   EMAIL_VERIFICATION_TTL=10m
   ```

   Without a working Brevo email key, the verification codes and reset links appear in the
   backend's terminal output instead of your inbox. That is fine for testing.

2. Run the database migrations, then start the backend so it listens on port **6767**.
3. Check that it answers: `curl -i http://localhost:6767/auth/me` should return `401`. Any
   response means it is running; "connection refused" means it is not.

If you get stuck here, ask whoever maintains the backend, or open Claude Code in the backend
folder and ask it to start the backend locally.

## Step 3: Run the manual test scenarios (T127)

1. In `touch-grass`, run `pnpm dev` and open **http://localhost:3000**. Always use `localhost`,
   not `127.0.0.1`: cookies are stored per hostname.
2. Work through the 25 scenarios in the table in [quickstart.md](./quickstart.md#manual-scenarios).
   Each row lists what to do and what you should see. Keep the backend's terminal visible:
   several checks count calls in its log (for example scenario 13: exactly **one**
   `/auth/refresh`).
3. For the security checks, open the browser's DevTools → Application → Cookies: `tg_at` and
   `tg_rt` must show **HttpOnly** ✓, and Local Storage and Session Storage must contain no tokens.
4. Note any scenario that doesn't behave as described, and fix it before merging.

Claude Code can run these scenarios in a browser for you. Once the backend is running, ask: "the
backend is running on 6767, run the T127 quickstart scenarios".

## Step 4: Push the branch and open a pull request

After Step 1 (`.env.local`), run `git push -u origin feat/login-page` and open a PR into `main`.
In the PR description, list these intentional differences from the Figma design and the task
text, so reviewers know they are on purpose:

- The hero photo looks soft: the original in Figma is only 343×512 pixels. A larger image has to
  come from design.
- Field labels are mixed case ("Email"), as Figma renders them, not uppercase.
- The divider between the form and the Google button reads "or", not "or continue with", because
  the button itself already says "Continue with Google".
- One full-width "Continue with Google" button replaces Figma's three icon buttons; there is no
  GitHub or Discord sign-in (FR-026).
- The input border, placeholder, and focus ring colours are darker than in Figma so they pass
  WCAG AA contrast.
- "Confirm password" is a required field, so an empty signup shows all three errors.

Add the T127 results from Step 3 as well.

## Step 5: Set up Vercel before the first deploy (T008a)

The deployed app uses Upstash Redis so token refreshes stay safe across Vercel's servers. A
deployment without these settings fails on its first request.

1. In the Vercel dashboard, open the project → **Storage** (Marketplace) → add **Upstash Redis**
   and connect it to both **Preview** and **Production**. This sets `UPSTASH_REDIS_REST_URL` and
   `UPSTASH_REDIS_REST_TOKEN` for you. If the integration names them differently (for example
   `KV_REST_API_URL`), add copies under the names above.
2. Run `openssl rand -base64 32` on your computer and add the output as `SESSION_CACHE_KEY`, for
   Preview and Production.
3. Add `NEXT_PUBLIC_API_URL` set to the deployed backend's URL, for Preview and Production. CI
   reads it with `vercel pull`.
4. Point the backend's `FRONTEND_URL` at the Vercel preview URL (or a stable preview alias).
5. Tick T008a in `tasks.md`.

## Step 6: Before going to production (backend repository)

This is not a frontend task, but production must wait for it (constitution TODO
`BACKEND_RATE_LIMIT_IP`). The backend limits requests per client IP. All requests now come from
the Next.js server, so every user would share one limit (for example 5 logins per minute for
everyone). The frontend already sends the real client IP in `X-Forwarded-For`; the backend must
be configured to trust that header (`trust proxy` in NestJS/Express) and use it for rate
limiting.

---

## Checklist

- [ ] Step 1: `.env.local` created
- [ ] Step 2: backend running on `localhost:6767`
- [ ] Step 3: 25 quickstart scenarios pass → tick **T127** in `tasks.md`
- [ ] Step 4: branch pushed, PR opened with the deviations and T127 results
- [ ] Step 5: Vercel variables set → tick **T008a** in `tasks.md`
- [ ] Step 6: backend trusts `X-Forwarded-For` before production
