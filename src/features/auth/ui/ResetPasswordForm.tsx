"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"

import { useResetPassword } from "../api/use-reset-password"
import type { AuthErrorCode } from "../model/auth-error"
import { ResetPasswordSchema } from "../model/reset-password.schema"
import { useFormFailure } from "../model/use-form-failure"
import { FormErrorAlert } from "./FormErrorAlert"
import { PasswordField } from "./PasswordField"
import {
  DEAD_LINK_ERRORS,
  ResetPasswordOutcome,
  type ResetOutcome,
} from "./ResetPasswordOutcome"
import { SubmitButton } from "./SubmitButton"

type ResetPasswordValues = z.input<typeof ResetPasswordSchema>

const isDeadLink = (
  error: AuthErrorCode
): error is (typeof DEAD_LINK_ERRORS)[number] =>
  (DEAD_LINK_ERRORS as readonly AuthErrorCode[]).includes(error)

/** The single-use token arrives as a prop and lives only in state once the URL is stripped. */
export function ResetPasswordForm({ initialToken }: { initialToken?: string }) {
  const [outcome, setOutcome] = useState<ResetOutcome | null>(
    initialToken ? null : "RESET_INVALID"
  )

  useEffect(() => {
    window.history.replaceState(null, "", "/reset-password")
  }, [])

  const form = useForm<
    ResetPasswordValues,
    unknown,
    z.output<typeof ResetPasswordSchema>
  >({
    resolver: zodResolver(ResetPasswordSchema),
    mode: "onTouched",
    defaultValues: {
      token: initialToken ?? "",
      password: "",
      confirmPassword: "",
    },
  })
  const { errors } = form.formState

  const failure = useFormFailure(form.setError, ["password", "confirmPassword"])
  const mutation = useResetPassword({
    onSuccess: () => setOutcome("success"),
    onFailure: (result) => {
      if (isDeadLink(result.error)) setOutcome(result.error)
      else failure.onFailure(result)
    },
  })

  if (outcome) return <ResetPasswordOutcome outcome={outcome} />

  const onSubmit = form.handleSubmit((values) => {
    failure.clearFormError()
    mutation.mutate(values)
  })

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      <FormErrorAlert code={failure.formError} />
      <PasswordField
        label="New password"
        placeholder="Enter a new password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...form.register("password")}
      />
      <PasswordField
        label="Confirm password"
        placeholder="Re-enter the new password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...form.register("confirmPassword")}
      />
      <div className="pt-3">
        <SubmitButton pending={mutation.isPending}>Reset password</SubmitButton>
      </div>
    </form>
  )
}
