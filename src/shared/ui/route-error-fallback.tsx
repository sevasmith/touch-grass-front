"use client"

import { Button } from "@/shared/ui/button"

/** Generic error UI for route error boundaries: never shows the raw error. */
export function RouteErrorFallback({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div
        role="alert"
        className="flex max-w-[440px] flex-col items-center gap-6 text-center"
      >
        <p className="text-base text-muted-foreground">
          Something went wrong. Please try again.
        </p>
        <Button size="lg" onClick={reset}>
          Retry
        </Button>
      </div>
    </main>
  )
}
