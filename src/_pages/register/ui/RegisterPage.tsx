import { AuthDivider, GoogleSignInButton, RegisterForm } from "@/features/auth"
import { AuthPageHeader } from "@/widgets/auth-shell"

export function RegisterPage() {
  return (
    <div className="flex flex-col gap-12">
      <AuthPageHeader
        title="Join Touch Grass"
        subtitle="Create an account to start your journey."
      />
      <RegisterForm />
      <AuthDivider />
      <GoogleSignInButton />
    </div>
  )
}
