import { z } from "zod"

/** Kept as a string so leading zeros survive (FR-017). */
export const VerifyEmailSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
})

export type VerifyEmailInput = z.input<typeof VerifyEmailSchema>
