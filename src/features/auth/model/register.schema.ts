import { z } from "zod"

import {
  EmailSchema,
  NewPasswordSchema,
  withPasswordConfirmation,
} from "./fields"

export const RegisterSchema = withPasswordConfirmation(
  z.object({
    email: EmailSchema,
    password: NewPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
)

export type RegisterInput = z.input<typeof RegisterSchema>
