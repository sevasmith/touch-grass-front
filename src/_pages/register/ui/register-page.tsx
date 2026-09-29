import Link from "next/link"

import { AuthShell, RegisterForm } from "@/features/auth"

export function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Sign up to get started."
      footer={
        <p>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium underline underline-offset-4"
          >
            Log in
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthShell>
  )
}
