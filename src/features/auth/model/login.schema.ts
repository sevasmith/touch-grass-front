import { z } from "zod"

import { EmailSchema } from "./fields"

/** No length rule on the password: legacy or long passwords must still reach the backend. */
export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, "Enter your password"),
})

export type LoginInput = z.input<typeof LoginSchema>
