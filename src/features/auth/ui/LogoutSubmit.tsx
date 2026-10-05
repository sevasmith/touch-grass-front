"use client"

import type { ReactNode } from "react"
import { useFormStatus } from "react-dom"

import { Button } from "@/shared/ui/button"
import { Spinner } from "@/shared/ui/spinner"

export function LogoutSubmit({
  appearance = "button",
  children = "Log out",
}: {
  appearance?: "button" | "link"
  children?: ReactNode
}) {
  const { pending } = useFormStatus()

  if (appearance === "link") {
    return (
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer font-semibold text-link underline-offset-4 hover:underline disabled:cursor-default disabled:opacity-50"
      >
        {children}
      </button>
    )
  }

  return (
    <Button type="submit" variant="outline" size="lg" disabled={pending}>
      {pending ? <Spinner /> : null}
      {children}
    </Button>
  )
}
