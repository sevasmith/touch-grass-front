"use client"

import { Button } from "@/shared/ui/button"

export function RetryButton() {
  return (
    <Button size="lg" onClick={() => window.location.reload()}>
      Retry
    </Button>
  )
}
