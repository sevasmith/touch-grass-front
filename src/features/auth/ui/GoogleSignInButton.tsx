import Image from "next/image"

import { cn } from "@/shared/lib/utils"
import { buttonVariants } from "@/shared/ui/button"

import { GOOGLE_START_URL } from "../config/google"

/**
 * A plain link: Google sign-in must start with a top-level navigation to the backend, never a
 * fetch, because the backend sets its OAuth `state` cookie on that response (FR-022).
 */
export function GoogleSignInButton() {
  return (
    <a
      href={GOOGLE_START_URL}
      className={cn(
        buttonVariants({ variant: "outline" }),
        "h-auto w-full gap-3 rounded-sm border-border bg-transparent py-3 text-base font-semibold text-foreground"
      )}
    >
      <Image src="/icons/google.png" alt="" width={24} height={24} />
      Continue with Google
    </a>
  )
}
