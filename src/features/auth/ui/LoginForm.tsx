"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"

import { useLogin } from "../api/use-login"
import type { AuthErrorCode } from "../model/auth-error"
import { LoginSchema } from "../model/login.schema"
import { EmailField } from "./EmailField"
import { FormErrorAlert } from "./FormErrorAlert"
import { PasswordField } from "./PasswordField"
import { SubmitButton } from "./SubmitButton"

type LoginValues = z.input<typeof LoginSchema>

export function LoginForm() {
  const [formError, setFormError] = useState<AuthErrorCode | null>(null)
  const form = useForm<LoginValues, unknown, z.output<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  })
  const { errors } = form.formState

  const mutation = useLogin({
    onFailure: (failure) => {
      setFormError(failure.error)
      if (!("fieldErrors" in failure)) return
      for (const [field, message] of Object.entries(
        failure.fieldErrors ?? {}
      )) {
        if (field === "email" || field === "password")
          form.setError(field, { message })
      }
    },
  })

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null)
    mutation.mutate(values)
  })

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      <FormErrorAlert code={formError} />
      <EmailField error={errors.email?.message} {...form.register("email")} />
      <PasswordField
        autoComplete="current-password"
        error={errors.password?.message}
        {...form.register("password")}
      />
      <div className="pt-3">
        <SubmitButton pending={mutation.isPending}>Log In</SubmitButton>
      </div>
    </form>
  )
}
