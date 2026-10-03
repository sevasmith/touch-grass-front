import { cn } from "@/shared/lib/utils"
import { buttonVariants } from "@/shared/ui/button"

import { GOOGLE_START_URL } from "../config/google"
import type { AuthErrorCode } from "../model/auth-error"
import { BackToLoginLink } from "./BackToLoginLink"
import { FormErrorAlert } from "./FormErrorAlert"

/** Every Google sign-in failure gets its own message plus a way to retry or go back. */
export function OAuthErrorCard({ code }: { code: AuthErrorCode }) {
  return (
    <div className="flex flex-col gap-6">
      <FormErrorAlert code={code} />
      <a
        href={GOOGLE_START_URL}
        className={cn(
          buttonVariants(),
          "h-auto w-full py-3 text-lg leading-[1.6] font-semibold"
        )}
      >
        Try again
      </a>
      <BackToLoginLink />
    </div>
  )
}
