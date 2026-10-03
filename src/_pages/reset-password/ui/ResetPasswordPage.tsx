import { parseResetPasswordParams, ResetPasswordForm } from "@/features/auth"
import { AuthPageHeader } from "@/widgets/auth-shell"

interface ResetPasswordPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token } = parseResetPasswordParams(await searchParams)

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
