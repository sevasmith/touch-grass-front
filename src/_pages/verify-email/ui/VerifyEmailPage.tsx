import { VerifyEmailForm } from "@/features/auth"
import { AuthPageHeader } from "@/widgets/auth-shell"

import { getInitialCooldownEndsAt } from "../api/get-initial-cooldown"

/** Arriving from signup or a resend starts in cooldown; from login or a 403 it starts enabled. */
export async function VerifyEmailPage() {
  const initialCooldownEndsAt = await getInitialCooldownEndsAt()

  return (
    <div className="flex flex-col gap-12">
      <AuthPageHeader
        title="Verify your email"
        subtitle="We sent a 6-digit code to your email. Enter it below to finish setting up your account."
      />
      <VerifyEmailForm initialCooldownEndsAt={initialCooldownEndsAt} />
    </div>
  )
}
