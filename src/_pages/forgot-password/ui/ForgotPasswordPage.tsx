import { ForgotPasswordForm } from "@/features/auth"
import { AuthPageHeader } from "@/widgets/auth-shell"

export function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-12">
      <AuthPageHeader
        title="Reset your password"
        subtitle="Enter your email and we'll send you a link to set a new password."
      />
      <ForgotPasswordForm />
    </div>
  )
}
