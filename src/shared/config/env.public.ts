import { z } from "zod"

export const PublicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url(),
})

export type PublicEnv = z.infer<typeof PublicEnvSchema>

// The literal `process.env.NEXT_PUBLIC_API_URL` reference lets Next inline it into client bundles.
export const publicEnv: PublicEnv = PublicEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
})
