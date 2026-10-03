import Link from "next/link"

import { cn } from "@/shared/lib/utils"
import { buttonVariants } from "@/shared/ui/button"

import { GOOGLE_START_URL } from "../config/google"
import type { AuthErrorCode } from "../model/auth-error"
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
      <Link
        href="/login"
        className="self-center text-sm leading-5 font-semibold text-link underline-offset-4 hover:underline"
      >
        Back to log in
      </Link>
    </div>
  )
}
