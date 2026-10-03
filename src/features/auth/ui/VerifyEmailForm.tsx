"use client"

import { useId, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { REGEXP_ONLY_DIGITS } from "input-otp"
import { Controller, useForm } from "react-hook-form"

import { Field, FieldError, FieldLabel } from "@/shared/ui/field"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/shared/ui/input-otp"

import { useVerifyEmail } from "../api/use-verify-email"
import type { AuthErrorCode } from "../model/auth-error"
import { useFormFailure } from "../model/use-form-failure"
import {
  VerifyEmailSchema,
  type VerifyEmailInput,
} from "../model/verify-email.schema"
import { FormErrorAlert } from "./FormErrorAlert"
import { ResendCodeButton } from "./ResendCodeButton"
import { SubmitButton } from "./SubmitButton"

/** Failures after which the current code is unusable, so resending is the way forward. */
const NEEDS_RESEND = new Set<AuthErrorCode>([
  "CODE_EXPIRED",
  "CODE_NONE_ACTIVE",
  "CODE_ATTEMPTS_EXHAUSTED",
])
const SLOTS = [0, 1, 2, 3, 4, 5] as const

export function VerifyEmailForm({
  initialCooldownEndsAt,
}: {
  initialCooldownEndsAt: number | null
}) {
  const inputId = useId()
  const errorId = `${inputId}-error`
  const [needsResend, setNeedsResend] = useState(false)
  const form = useForm<VerifyEmailInput>({
    resolver: zodResolver(VerifyEmailSchema),
    defaultValues: { code: "" },
  })
  const codeError = form.formState.errors.code?.message

  const failure = useFormFailure(form.setError, ["code"])
  const mutation = useVerifyEmail({
    onFailure: (result) => {
      failure.onFailure(result)
      // A wrong code used up an attempt; start the next try from an empty input.
      if (result.error === "CODE_INVALID") form.setValue("code", "")
      setNeedsResend(NEEDS_RESEND.has(result.error))
    },
  })

  // No auto-submit on the 6th digit: submitting is explicit (button or Enter).
  const onSubmit = form.handleSubmit((values) => {
    failure.clearFormError()
    mutation.mutate(values)
  })

  return (
    <div className="flex flex-col gap-6">
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
        <FormErrorAlert code={failure.formError} />
        <Field data-invalid={codeError ? true : undefined} className="gap-2">
          <FieldLabel
            htmlFor={inputId}
            className="text-xs leading-3 font-semibold tracking-label text-muted-foreground"
          >
            Verification code
          </FieldLabel>
          <Controller
            name="code"
            control={form.control}
            render={({ field }) => (
              <InputOTP
                id={inputId}
                maxLength={6}
                pattern={REGEXP_ONLY_DIGITS}
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-invalid={codeError ? true : undefined}
                aria-describedby={codeError ? errorId : undefined}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                containerClassName="justify-center"
              >
                <InputOTPGroup>
                  {SLOTS.map((index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="size-12 bg-input-background text-lg"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            )}
          />
          {codeError ? <FieldError id={errorId}>{codeError}</FieldError> : null}
        </Field>
        <SubmitButton pending={mutation.isPending}>Verify</SubmitButton>
      </form>
      <ResendCodeButton
        initialCooldownEndsAt={initialCooldownEndsAt}
        emphasised={needsResend}
      />
    </div>
  )
}
