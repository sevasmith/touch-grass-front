import Link from "next/link"

import { AuthShell, ForgotPasswordForm } from "@/features/auth"

interface ForgotPasswordPageProps {
  sent?: boolean
}

export function ForgotPasswordPage({ sent = false }: ForgotPasswordPageProps) {
  return (
    <AuthShell
      title="Forgot password"
      description="Enter your email and we'll send you a reset link."
      footer={
        <p>
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-medium underline underline-offset-4"
          >
            Log in
          </Link>
        </p>
      }
    >
      {sent ? (
        <p role="status" className="text-sm text-muted-foreground">
          Check your email for a reset link.
        </p>
      ) : (
        <ForgotPasswordForm />
      )}
    </AuthShell>
  )
}
