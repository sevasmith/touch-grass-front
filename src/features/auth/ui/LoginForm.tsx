"use client"

import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"

import { useLogin } from "../api/use-login"
import { LoginSchema } from "../model/login.schema"
import { useFormFailure } from "../model/use-form-failure"
import { EmailField } from "./EmailField"
import { FormErrorAlert } from "./FormErrorAlert"
import { PasswordField } from "./PasswordField"
import { SubmitButton } from "./SubmitButton"

type LoginValues = z.input<typeof LoginSchema>

export function LoginForm() {
  const form = useForm<LoginValues, unknown, z.output<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  })
  const { errors } = form.formState

  const { formError, onFailure, clearFormError } = useFormFailure(
    form.setError,
    ["email", "password"]
  )
  const mutation = useLogin({ onFailure })

  const onSubmit = form.handleSubmit((values) => {
    clearFormError()
    mutation.mutate(values)
  })

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      <FormErrorAlert code={formError} />
      <EmailField error={errors.email?.message} {...form.register("email")} />
      <PasswordField
        autoComplete="current-password"
        labelAside={
          <Link
            href="/forgot-password"
            className="text-sm leading-5 font-semibold text-link underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        }
        error={errors.password?.message}
        {...form.register("password")}
      />
      <div className="pt-3">
        <SubmitButton pending={mutation.isPending}>Log In</SubmitButton>
      </div>
    </form>
  )
}
