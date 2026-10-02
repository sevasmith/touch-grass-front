# Contract: Routes, Tiers, Proxy & Session Lifecycle

## Route tiers

| Route                  | Tier               | Proxy behaviour when the tier isn't met                  | Renders (`src/_pages/…`) |
| ---------------------- | ------------------ | -------------------------------------------------------- | ------------------------ |
| `/login`               | Public             | Valid session → `/map`, or `/verify-email` if unverified | `login`                  |
| `/register`            | Public             | same as `/login`                                         | `register`               |
| `/forgot-password`     | Public             | none                                                     | `forgot-password`        |
| `/reset-password`      | Public             | none (query `token`)                                     | `reset-password`         |
| `/oauth/complete`      | Public             | none (query `token` \| `error`)                          | `oauth-complete`         |
| `/session-unavailable` | Public             | none (proxy **rewrite** target; never linked)            | `session-unavailable`    |
| `/verify-email`        | Unverified         | No session → `/login`; verified → `/map`                 | `verify-email`           |
| `/map` (placeholder)   | Verified           | No session → `/login`; unverified → `/verify-email`      | `map`                    |
| `/`                    | (verified)         | `app/page.tsx` → `redirect("/map")`                      | none                     |
| _anything else_        | Verified (default) | No session → `/login`; unverified → `/verify-email`      | none                     |

`/login?reason=session_expired` shows the "session ended" notice. `reason` is validated by Zod
(enum), and unknown values are ignored.

## Proxy algorithm (`proxy.ts` → `src/_app/proxy/proxy.ts`)

```text
matcher: all paths except _next/static, _next/image, favicon.ico, images/*, icons/*
if method != GET or has header "Next-Action": pass through (actions handle their own 401/403)
tier = ROUTE_TIERS[pathname] ?? "verified"
hasSession = cookies has tg_at && tg_rt

public:
  if pathname in {/login, /register} && hasSession:
     me = resolveMe()                       // may refresh
     ok        → redirect(me.emailVerified ? /map : /verify-email)
     revoked   → clear cookies, pass through
     transient → pass through (login page still usable)
  else pass through

unverified | verified:
  if !hasSession → redirect(/login)
  me = resolveMe()
    revoked   → clear cookies, redirect(/login?reason=session_expired)
    transient → rewrite(/session-unavailable)        // URL & cookies unchanged
    ok        → tier == verified && !me.emailVerified → redirect(/verify-email)
                tier == unverified && me.emailVerified → redirect(/map)
                else pass through

resolveMe():
  r = GET /auth/me with tg_at
  if r == 401: o = coordinator.refresh(tg_rt)
     ok → write pair to response cookies AND forwarded request cookies; retry GET /auth/me once
     revoked | transient → return o
  return ok(me) | transient(network/5xx/429) | revoked(401 after refresh)
```

When proxy refreshes, it calls `NextResponse.next({ request: { headers } })` with a rewritten
`cookie` header, so the RSC render in the **same** request reads the new `tg_at` and does not reuse
the stale one.

## Refresh coordinator protocol

See [research.md §R2](../research.md#r2-single-flight-rotation-safe-refresh-on-vercel-serverless)
and [data-model.md §2](../data-model.md#refresh-coordinator-records--srcentitiessessionlibrefresh-coordinatorts).

```text
refresh(oldRt):
  h = sha256hex(oldRt)
  cached = store.get(rt:result:h) → decrypt → return
  if store.setNx(rt:lock:h, uuid, 10_000):
     r = POST /auth/refresh { refreshToken: oldRt }
     200 → store.set(rt:result:h, enc({kind:ok,pair}), 30_000); return ok
     401 → store.set(rt:result:h, enc({kind:revoked}), 30_000); return revoked
     else→ store.del(rt:lock:h); return transient
  else poll store.get(rt:result:h) every 100 ms ≤ 4 s
     found → return decrypted
     lock gone && not yet retried → retry acquire once
     timeout → return transient
```

Used by **proxy** (`resolveMe`) and **`authedFetch`** (Server Actions). It is never called from an
RSC.

## Cookie writes

| Event                                   | `tg_at` / `tg_rt` | `tg_code_sent_at`  |
| --------------------------------------- | ----------------- | ------------------ |
| login / signup / oauth exchange success | set               | set on signup only |
| refresh ok (proxy or action)            | replaced          | unchanged          |
| refresh revoked                         | deleted           | deleted            |
| logout (any backend result)             | deleted           | deleted            |
| reset success / reset "already used"    | deleted           | deleted            |
| resend `204` / `429` / `503`            | unchanged         | set to now         |

## Security checklist (verified by tests and the quickstart)

- No token appears in an action result, RSC payload, `document.cookie`, `localStorage`, or
  `sessionStorage` (SC-010).
- `tg_*` cookies are `HttpOnly`. `Secure` is set in production.
- Server Action `Origin` checking is left at Next defaults.
- `server-only` is imported by every module touching tokens or secrets.
- The `token` query parameter on `/oauth/complete` and `/reset-password` is gone from
  `location.href` after mount (SC-007).
- Logs never include tokens, codes, or passwords.
