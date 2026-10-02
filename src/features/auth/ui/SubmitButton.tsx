import type { ReactNode } from "react"

import { Button } from "@/shared/ui/button"
import { Spinner } from "@/shared/ui/spinner"

/** Full-width primary submit per Figma 1:2 (Hanken SemiBold 18/28.8), disabled with a spinner while pending. */
export function SubmitButton({
  pending,
  children,
}: {
  pending: boolean
  children: ReactNode
}) {
  return (
    <Button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className="h-auto w-full gap-2 py-3 text-lg leading-[28.8px] font-semibold"
    >
      {pending ? <Spinner className="size-5" /> : null}
      {children}
    </Button>
  )
}
