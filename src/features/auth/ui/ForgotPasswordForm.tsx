"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"

import { useForgotPassword } from "../api/use-forgot-password"
import { FORGOT_PASSWORD_CONFIRMATION } from "../config/forgot-password"
import { ForgotPasswordSchema } from "../model/forgot-password.schema"
import { useFormFailure } from "../model/use-form-failure"
import { BackToLoginLink } from "./BackToLoginLink"
import { EmailField } from "./EmailField"
import { FormErrorAlert } from "./FormErrorAlert"
import { SubmitButton } from "./SubmitButton"

type ForgotPasswordValues = z.input<typeof ForgotPasswordSchema>

export function ForgotPasswordForm() {
  const form = useForm<
    ForgotPasswordValues,
    unknown,
    z.output<typeof ForgotPasswordSchema>
  >({
    resolver: zodResolver(ForgotPasswordSchema),
    mode: "onTouched",
    defaultValues: { email: "" },
  })
  const { formError, onFailure, clearFormError } = useFormFailure(
    form.setError,
    ["email"]
  )
  const mutation = useForgotPassword({ onFailure })

  // Identical for every email, registered or not (SC-008).
  if (mutation.data?.ok) {
    return (
      <div className="flex flex-col gap-6">
        <p role="status" className="text-base text-foreground">
          {FORGOT_PASSWORD_CONFIRMATION}
        </p>
        <BackToLoginLink />
      </div>
    )
  }

  const onSubmit = form.handleSubmit((values) => {
    clearFormError()
    mutation.mutate(values)
  })

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      <FormErrorAlert code={formError} />
      <EmailField
        error={form.formState.errors.email?.message}
        {...form.register("email")}
      />
      <div className="flex flex-col gap-6 pt-3">
        <SubmitButton pending={mutation.isPending}>
          Send reset link
        </SubmitButton>
        <BackToLoginLink />
      </div>
    </form>
  )
}
