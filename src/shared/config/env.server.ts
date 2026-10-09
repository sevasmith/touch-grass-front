import "server-only"

import { z } from "zod"

const BASE64 =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/

// `.env` files often leave a variable present but blank; treat that as unset.
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional())

function isAes256Key(value: string): boolean {
  return BASE64.test(value) && Buffer.from(value, "base64").length === 32
}

export const ServerEnvSchema = z
  .object({
    NEXT_PUBLIC_API_URL: z.url(),
    SESSION_COOKIE_MAX_AGE: z.coerce.number().int().positive().default(2592000),
    UPSTASH_REDIS_REST_URL: optional(z.url()),
    UPSTASH_REDIS_REST_TOKEN: optional(z.string()),
    SESSION_CACHE_KEY: optional(
      z.string().refine(isAes256Key, "must be base64 of exactly 32 bytes")
    ),
  })
  .superRefine((env, ctx) => {
    const hasUrl = env.UPSTASH_REDIS_REST_URL !== undefined
    const hasToken = env.UPSTASH_REDIS_REST_TOKEN !== undefined
    if (hasUrl !== hasToken) {
      ctx.addIssue({
        code: "custom",
        path: [hasUrl ? "UPSTASH_REDIS_REST_TOKEN" : "UPSTASH_REDIS_REST_URL"],
        message: "set both Upstash variables or neither",
      })
    }
    // A shared store needs a shared key; per-process random keys can't read each other's entries.
    if (hasUrl && hasToken && env.SESSION_CACHE_KEY === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["SESSION_CACHE_KEY"],
        message: "required when Upstash is set",
      })
    }
  })

export type ServerEnv = z.infer<typeof ServerEnvSchema>

export const serverEnv: ServerEnv = ServerEnvSchema.parse(process.env)
