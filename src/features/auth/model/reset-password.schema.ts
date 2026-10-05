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
