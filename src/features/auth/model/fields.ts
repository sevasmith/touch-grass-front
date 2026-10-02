import { z } from "zod"

export const EmailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email")
  .pipe(z.email("Enter a valid email address"))

/** 8–72 characters and no composition rules (FR-032). */
export const NewPasswordSchema = z
  .string()
  .min(8, "Password must be 8–72 characters")
  .max(72, "Password must be 8–72 characters")

type WithConfirmation = z.ZodObject<{
  password: z.ZodType<string>
  confirmPassword: z.ZodType<string>
}>

/** Adds the "Passwords don't match" check, reported on `confirmPassword`. */
export function withPasswordConfirmation<T extends WithConfirmation>(
  schema: T
) {
  return schema.refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
    // Run even when other fields (e.g. email) are invalid, so every error shows at once.
    when: ({ value }) => {
      const { password, confirmPassword } = (value ?? {}) as Record<
        string,
        unknown
      >
      return typeof password === "string" && typeof confirmPassword === "string"
    },
  })
}
