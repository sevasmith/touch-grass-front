import { z } from "zod"

/** Opaque backend tokens: never decoded, never sent to the browser. */
export const TokenPairSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
})

export type TokenPair = z.infer<typeof TokenPairSchema>
