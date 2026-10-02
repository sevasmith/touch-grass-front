import { Alert, AlertDescription } from "@/shared/ui/alert"

import { AUTH_ERROR_COPY, type AuthErrorCode } from "../model/auth-error"

export function FormErrorAlert({ code }: { code?: AuthErrorCode | null }) {
  if (!code) return null

  return (
    <Alert variant="destructive">
      <AlertDescription className="text-destructive">
        {AUTH_ERROR_COPY[code]}
      </AlertDescription>
    </Alert>
  )
}
