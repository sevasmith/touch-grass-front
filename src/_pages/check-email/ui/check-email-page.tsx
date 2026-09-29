"use client"

import { useActionState } from "react"

import { AuthShell, logout, resendVerificationEmail } from "@/features/auth"
import { Button } from "@/shared/components/ui/button"

export function CheckEmailPage() {
  const [state, formAction, isPending] = useActionState(
    resendVerificationEmail,
    undefined
  )
  const sent = state !== undefined && !state.formError

  return (
    <AuthShell
      title="Check your email"
      description="Verify your email address to continue."
    >
      <p className="text-sm text-muted-foreground">
        We sent a verification link to your email address. Click the link in the
        email to verify your account. If you don&apos;t see it, check your spam
        folder.
      </p>

      <form action={formAction} className="mt-6">
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Sending…" : "Resend verification email"}
        </Button>
      </form>

      {sent ? (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          Verification email sent.
        </p>
      ) : null}

      {state?.formError ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {state.formError}
        </p>
      ) : null}

      <form action={logout} className="mt-6">
        <Button type="submit" variant="ghost" className="w-full">
          Log out
        </Button>
      </form>
    </AuthShell>
  )
}
