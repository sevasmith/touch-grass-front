"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"

import { useRegister } from "../api/use-register"
import { RegisterSchema } from "../model/register.schema"
import { useFormFailure } from "../model/use-form-failure"
import { EmailField } from "./EmailField"
import { FormErrorAlert } from "./FormErrorAlert"
import { PasswordField } from "./PasswordField"
import { SubmitButton } from "./SubmitButton"

type RegisterValues = z.input<typeof RegisterSchema>

export function RegisterForm() {
  const form = useForm<
    RegisterValues,
    unknown,
    z.output<typeof RegisterSchema>
  >({
    resolver: zodResolver(RegisterSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "", confirmPassword: "" },
  })
  const { errors } = form.formState

  const { formError, onFailure, clearFormError } = useFormFailure(
    form.setError,
    ["email", "password", "confirmPassword"]
  )
  const mutation = useRegister({ onFailure })

  const onSubmit = form.handleSubmit((values) => {
    clearFormError()
    mutation.mutate(values)
  })

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      <FormErrorAlert code={formError} />
      <EmailField error={errors.email?.message} {...form.register("email")} />
      <PasswordField
        autoComplete="new-password"
        error={errors.password?.message}
        {...form.register("password")}
      />
      <PasswordField
        label="Confirm password"
        placeholder="Re-enter your password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...form.register("confirmPassword")}
      />
      <div className="pt-3">
        <SubmitButton pending={mutation.isPending}>Sign Up</SubmitButton>
      </div>
    </form>
  )
}
