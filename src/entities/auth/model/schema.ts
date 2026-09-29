import { z } from "zod"

export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  email: z.email(),
  emailVerified: z.boolean(),
})

export type AuthUser = z.infer<typeof AuthUserSchema>

export const SessionResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.string().datetime(),
  user: AuthUserSchema,
})

export type SessionResponse = z.infer<typeof SessionResponseSchema>

export const ApiErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
})

export type ApiError = z.infer<typeof ApiErrorSchema>
