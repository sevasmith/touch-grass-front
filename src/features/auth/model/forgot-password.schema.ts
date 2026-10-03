import { z } from "zod"

import { EmailSchema } from "./fields"

export const ForgotPasswordSchema = z.object({ email: EmailSchema })
export type ForgotPasswordInput = z.input<typeof ForgotPasswordSchema>

/** Parsed for shape only: the UI never shows the backend's message (SC-008). */
export const ForgotPasswordResponseSchema = z.object({ message: z.string() })
