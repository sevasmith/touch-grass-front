"use client"

import { startTransition, useActionState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

import { forgotPassword } from "../api/actions"
import {
  ForgotPasswordSchema,
  type ForgotPasswordInput,
} from "../model/schemas"

const FIELDS = ["email"] as const

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    forgotPassword,
    undefined
  )
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(ForgotPasswordSchema),
  })

  const onSubmit = handleSubmit((data) => {
    const formData = new FormData()
    formData.append("email", data.email)
    startTransition(() => {
      formAction(formData)
    })
  })

  useEffect(() => {
    if (state?.fieldErrors) {
      for (const field of FIELDS) {
        const messages = state.fieldErrors[field]
        if (messages && messages.length > 0) {
          setError(field, { type: "server", message: messages[0] })
        }
      }
    }
  }, [state, setError])

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={errors.email ? true : undefined}
          className={cn(
            "flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm",
            errors.email && "border-destructive"
          )}
          {...register("email")}
        />
        {errors.email ? (
          <p role="alert" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      {state?.formError ? (
        <p role="alert" className="text-sm text-destructive">
          {state.formError}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  )
}
