"use client"

import { RouteErrorFallback } from "@/shared/ui/route-error-fallback"

export default function RouteError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <RouteErrorFallback reset={reset} />
}
