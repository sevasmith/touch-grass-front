"use client"

import { startTransition, useActionState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

import { resetPassword } from "../api/actions"
import { ResetPasswordSchema, type ResetPasswordInput } from "../model/schemas"
import { PasswordField } from "./password-field"

const FIELDS = ["password", "confirmPassword"] as const

interface ResetPasswordFormProps {
  token: string
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [state, formAction, isPending] = useActionState(
    resetPassword,
    undefined
  )
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(ResetPasswordSchema),
  })

  const onSubmit = handleSubmit((data) => {
    const formData = new FormData()
    formData.append("password", data.password)
    formData.append("confirmPassword", data.confirmPassword)
    formData.append("token", token)
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
      <input type="hidden" defaultValue={token} {...register("token")} />
      <div className="space-y-1">
        <PasswordField
          id="password"
          label="New password"
          autoComplete="new-password"
          aria-invalid={errors.password ? true : undefined}
          className={cn(errors.password && "border-destructive")}
          {...register("password")}
        />
        {errors.password ? (
          <p role="alert" className="text-sm text-destructive">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1">
        <PasswordField
          id="confirmPassword"
          label="Confirm new password"
          autoComplete="new-password"
          aria-invalid={errors.confirmPassword ? true : undefined}
          className={cn(errors.confirmPassword && "border-destructive")}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword ? (
          <p role="alert" className="text-sm text-destructive">
            {errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      {state?.formError ? (
        <p role="alert" className="text-sm text-destructive">
          {state.formError}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Resetting…" : "Reset password"}
      </Button>
    </form>
  )
}
