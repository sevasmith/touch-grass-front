import { z } from "zod"

/** `GET /auth/me`: the only session data that may reach the browser (FR-021). */
export const CurrentUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  emailVerified: z.boolean(),
})

export type CurrentUser = z.infer<typeof CurrentUserSchema>
