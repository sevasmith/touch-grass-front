import { z } from "zod"

import { NewPasswordSchema, withPasswordConfirmation } from "./fields"

export const ResetPasswordSchema = withPasswordConfirmation(
  z.object({
    token: z.string().min(1),
    password: NewPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
)
export type ResetPasswordInput = z.input<typeof ResetPasswordSchema>

/** A missing, empty, or repeated `token` param means the link is unusable. */
export const ResetPasswordParamsSchema = z.object({
  token: z.string().min(1).optional().catch(undefined),
})

export function parseResetPasswordParams(
  searchParams: Record<string, string | string[] | undefined>
): { token?: string } {
  return ResetPasswordParamsSchema.parse({ token: searchParams.token })
}
