import Link from "next/link"

import { AuthShell, ResetPasswordForm } from "@/features/auth"

interface ResetPasswordPageProps {
  token?: string
}

export function ResetPasswordPage({ token = "" }: ResetPasswordPageProps) {
  return (
    <AuthShell
      title="Reset password"
      description="Choose a new password for your account."
      footer={
        <p>
          <Link
            href="/login"
            className="font-medium underline underline-offset-4"
          >
            Back to log in
          </Link>
        </p>
      }
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  )
}
