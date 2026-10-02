import { AUTH_ERROR_COPY } from "@/features/auth"

import { RetryButton } from "./RetryButton"

/** Proxy rewrite target when the session check fails transiently; the session is kept. */
export function SessionUnavailablePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="flex max-w-auth flex-col items-center gap-6 text-center">
        <h1 className="font-heading text-heading font-bold">
          We can&apos;t check your session right now
        </h1>
        <p className="text-base text-muted-foreground">
          {AUTH_ERROR_COPY.NETWORK_ERROR}
        </p>
        <RetryButton />
      </div>
    </main>
  )
}
