"use client"

import { useEffect, useState } from "react"

import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"
import { Spinner } from "@/shared/ui/spinner"

import { useResendVerification } from "../api/use-resend-verification"
import { secondsRemaining } from "../lib/cooldown"
import { AUTH_ERROR_COPY, type AuthErrorCode } from "../model/auth-error"

const SENT_COPY = "New code sent. Earlier codes no longer work."

interface ResendCodeButtonProps {
  initialCooldownEndsAt: number | null
  /** Highlighted when the current code can no longer be used (data-model §5, needsResend). */
  emphasised?: boolean
}

export function ResendCodeButton({
  initialCooldownEndsAt,
  emphasised = false,
}: ResendCodeButtonProps) {
  const [endsAt, setEndsAt] = useState(initialCooldownEndsAt)
  const [now, setNow] = useState(() => Date.now())
  const [status, setStatus] = useState<"sent" | AuthErrorCode | null>(null)

  useEffect(() => {
    if (endsAt === null) return
    const id = setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= endsAt) {
        clearInterval(id)
        setEndsAt(null)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  function startCooldown(until: number) {
    setNow(Date.now())
    setEndsAt(until)
  }

  const mutation = useResendVerification({
    onSuccess: (result) => {
      setStatus("sent")
      startCooldown(result.cooldownEndsAt)
    },
    onFailure: (failure) => {
      setStatus(failure.error)
      if ("cooldownEndsAt" in failure && failure.cooldownEndsAt) {
        startCooldown(failure.cooldownEndsAt)
      }
    },
  })

  const remaining = endsAt === null ? 0 : secondsRemaining(endsAt, now)

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        type="button"
        variant={emphasised ? "default" : "outline"}
        size="lg"
        data-emphasised={emphasised}
        disabled={remaining > 0 || mutation.isPending}
        onClick={() => mutation.mutate(undefined)}
        className="w-full"
      >
        {mutation.isPending ? <Spinner /> : null}
        <span suppressHydrationWarning>
          {remaining > 0 ? `Resend code in ${remaining}s` : "Resend code"}
        </span>
      </Button>
      <p
        aria-live="polite"
        className={cn(
          "min-h-5 text-center text-sm",
          status === "sent" ? "text-muted-foreground" : "text-destructive"
        )}
      >
        {status === "sent"
          ? SENT_COPY
          : status
            ? AUTH_ERROR_COPY[status]
            : null}
      </p>
    </div>
  )
}
