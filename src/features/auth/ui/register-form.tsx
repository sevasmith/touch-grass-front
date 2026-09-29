"use client"

import { startTransition, useActionState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

import { register } from "../api/actions"
import { RegisterSchema, type RegisterInput } from "../model/schemas"
import { PasswordField } from "./password-field"

const FIELDS = ["email", "password", "confirmPassword"] as const

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(register, undefined)
  const {
    register: registerField,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(RegisterSchema) })

  const onSubmit = handleSubmit((data) => {
    const formData = new FormData()
    formData.append("email", data.email)
    formData.append("password", data.password)
    formData.append("confirmPassword", data.confirmPassword)
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
          {...registerField("email")}
        />
        {errors.email ? (
          <p role="alert" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1">
        <PasswordField
          id="password"
          label="Password"
          autoComplete="new-password"
          aria-invalid={errors.password ? true : undefined}
          className={cn(errors.password && "border-destructive")}
          {...registerField("password")}
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
          label="Confirm password"
          autoComplete="new-password"
          aria-invalid={errors.confirmPassword ? true : undefined}
          className={cn(errors.confirmPassword && "border-destructive")}
          {...registerField("confirmPassword")}
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
        {isPending ? "Creating account…" : "Sign Up"}
      </Button>
    </form>
  )
}
