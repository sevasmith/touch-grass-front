import Link from "next/link"

import { cn } from "@/shared/lib/utils"
import { buttonVariants } from "@/shared/ui/button"

import { FormErrorAlert } from "./FormErrorAlert"

/** Reset outcomes after which the link can no longer be used (data-model §5). */
export const DEAD_LINK_ERRORS = [
  "RESET_INVALID",
  "RESET_EXPIRED",
  "RESET_REPLACED",
  "RESET_ALREADY_USED",
] as const
export type ResetOutcome = "success" | (typeof DEAD_LINK_ERRORS)[number]

const SUCCESS_COPY =
  "Your password has been reset. For your security you've been signed out everywhere."

const primaryLink = cn(
  buttonVariants(),
  "h-auto w-full py-3 text-lg font-semibold"
)

export function ResetPasswordOutcome({ outcome }: { outcome: ResetOutcome }) {
  if (outcome === "success" || outcome === "RESET_ALREADY_USED") {
    return (
      <div className="flex flex-col gap-6">
        {outcome === "success" ? (
          <p role="status" className="text-base text-foreground">
            {SUCCESS_COPY}
          </p>
        ) : (
          <FormErrorAlert code={outcome} />
        )}
        <Link href="/login" className={primaryLink}>
          Log in
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <FormErrorAlert code={outcome} />
      <Link href="/forgot-password" className={primaryLink}>
        Request a new link
      </Link>
    </div>
  )
}
