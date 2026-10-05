import { cookies } from "next/headers"

import { readHandoffToken } from "@/entities/session"
import { ResetPasswordForm } from "@/features/auth"
import { AuthPageHeader } from "@/widgets/auth-shell"

/** The proxy has already moved `?token=` into a cookie, so it is read from there. */
export async function ResetPasswordPage() {
  const token = readHandoffToken(await cookies(), "/reset-password")

  return (
    <div className="flex flex-col gap-12">
      <AuthPageHeader
        title="Set a new password"
        subtitle="Choose a password with 8 to 72 characters."
      />
      <ResetPasswordForm initialToken={token} />
    </div>
  )
}
