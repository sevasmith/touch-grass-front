import { z } from "zod"

/** Unknown or malformed values (including arrays) are ignored rather than rejected. */
export const LoginParamsSchema = z.object({
  reason: z.enum(["session_expired"]).optional().catch(undefined),
})
