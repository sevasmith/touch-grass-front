"use client"

import { useFormStatus } from "react-dom"

import { Button } from "@/shared/ui/button"
import { Spinner } from "@/shared/ui/spinner"

export function LogoutSubmit() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant="outline" size="lg" disabled={pending}>
      {pending ? <Spinner /> : null}
      Log out
    </Button>
  )
}
