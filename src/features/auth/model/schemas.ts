import { z } from "zod"

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1, { error: "Password is required" }),
})

export const RegisterSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email()),
    password: z
      .string()
      .min(8, { error: "Password must be at least 8 characters" }),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    error: "Passwords do not match",
    path: ["confirmPassword"],
  })

export const ForgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
})

export const ResetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { error: "Password must be at least 8 characters" }),
    confirmPassword: z.string(),
    token: z.string().min(1, { error: "Reset token is required" }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    error: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type LoginInput = z.infer<typeof LoginSchema>
export type RegisterInput = z.infer<typeof RegisterSchema>
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>
