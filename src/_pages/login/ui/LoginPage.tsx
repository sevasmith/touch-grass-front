import { AUTH_ERROR_COPY, LoginForm } from "@/features/auth"
import { Alert, AlertDescription } from "@/shared/ui/alert"

import { LoginParamsSchema } from "../model/login-params.schema"

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function LoginPage({ searchParams }: LoginPageProps) {
  const { reason } = LoginParamsSchema.parse(await searchParams)

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-3">
        <h1 className="font-heading text-[32px] leading-[38.4px] font-bold text-foreground">
          Welcome to Touch Grass
        </h1>
        <p className="text-base text-muted-foreground">
          Sign in to continue your journey.
        </p>
      </header>
      {reason === "session_expired" ? (
        <Alert>
          <AlertDescription className="text-foreground">
            {AUTH_ERROR_COPY.SESSION_EXPIRED}
          </AlertDescription>
        </Alert>
      ) : null}
      <LoginForm />
    </div>
  )
}
