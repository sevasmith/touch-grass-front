# Touch Grass — frontend

The Next.js frontend for Touch Grass. The NestJS backend lives in a separate repository; this app
talks to it only from the server (a Backend-for-Frontend), so tokens never reach the browser. The
backend API contract is documented in [`docs/backend-readme.md`](docs/backend-readme.md).

## Running locally

1. **Start the backend** from its own repository. Set its `FRONTEND_URL` to the frontend origin,
   `http://localhost:3000` (the scheme must match). The frontend does not need to be in the
   backend's `CORS_ORIGINS`, because every API call is made server-side.
2. **Create `.env.local`** in this repository:

   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:6767
   ```

   | Variable                   | Required         | Purpose                                                 |
   | -------------------------- | ---------------- | ------------------------------------------------------- |
   | `NEXT_PUBLIC_API_URL`      | always           | Backend base URL (Google sign-in link and server calls) |
   | `UPSTASH_REDIS_REST_URL`   | no (unused)      | Optional shared refresh-coordinator store               |
   | `UPSTASH_REDIS_REST_TOKEN` | no (unused)      | Optional shared refresh-coordinator store auth          |
   | `SESSION_CACHE_KEY`        | with Upstash     | Base64 of 32 random bytes; encrypts cached token pairs  |
   | `SESSION_COOKIE_MAX_AGE`   | no (default 30d) | Session cookie lifetime in seconds                      |

   Upstash Redis is not used for now: token refresh is de-duplicated in memory on each server
   instance, and the backend's 20-second refresh replay window covers the rest. If you ever set the
   Upstash variables, set both, plus `SESSION_CACHE_KEY` (`openssl rand -base64 32`). `pnpm build`
   needs only `NEXT_PUBLIC_API_URL` (Next inlines it at build time).

3. **Run the app** with `pnpm install` and `pnpm dev`, then open
   [http://localhost:3000](http://localhost:3000). Use `localhost` consistently, not `127.0.0.1`:
   cookies are stored per hostname.

Checks (also run by the pre-push hook and CI): `pnpm test:run`, `pnpm typecheck`, `pnpm lint`,
`pnpm build`.

## Deploying

Production runs on Vercel. Before the first deploy, set `NEXT_PUBLIC_API_URL` to the deployed
backend's URL for both Preview and Production. No other variables are needed.

> **Production blocker — TODO `BACKEND_RATE_LIMIT_IP`:** the backend rate-limits by client IP.
> Behind this BFF every request comes from the Next.js server, so all users would share one limit.
> The frontend forwards `X-Forwarded-For`; the backend must be configured to trust it before
> production.

## Project docs

- Project rules: [`AGENTS.md`](AGENTS.md) and the constitution in `.specify/memory/constitution.md`
- Auth feature spec, plan, and manual test scenarios:
  [`specs/001-auth-login-signup/`](specs/001-auth-login-signup/)
