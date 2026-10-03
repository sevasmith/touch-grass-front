import {
  AUTH_ERROR_COPY,
  AuthDivider,
  GoogleSignInButton,
  LoginForm,
} from "@/features/auth"
import { Alert, AlertDescription } from "@/shared/ui/alert"
import { AuthPageHeader } from "@/widgets/auth-shell"

import { LoginParamsSchema } from "../model/login-params.schema"

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function LoginPage({ searchParams }: LoginPageProps) {
  const { reason } = LoginParamsSchema.parse(await searchParams)

  return (
    <div className="flex flex-col gap-12">
      <AuthPageHeader
        title="Welcome to Touch Grass"
        subtitle="Sign in to continue your journey."
      />
      {reason === "session_expired" ? (
        <Alert>
          <AlertDescription className="text-foreground">
            {AUTH_ERROR_COPY.SESSION_EXPIRED}
          </AlertDescription>
        </Alert>
      ) : null}
      <LoginForm />
      <AuthDivider />
      <GoogleSignInButton />
    </div>
  )
}
