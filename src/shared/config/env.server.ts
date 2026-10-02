import "server-only"

import { z } from "zod"

const BUILD_PHASE = "phase-production-build"
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
    VERCEL: optional(z.string()),
    NEXT_PHASE: optional(z.string()),
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

    // Secrets are checked when a Vercel deployment serves its first request, never during
    // `next build`, so local builds and CI need none (research R14).
    const onVercelRuntime = env.VERCEL === "1" && env.NEXT_PHASE !== BUILD_PHASE
    if (!onVercelRuntime) return
    for (const name of [
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
      "SESSION_CACHE_KEY",
    ] as const) {
      if (env[name] === undefined) {
        ctx.addIssue({
          code: "custom",
          path: [name],
          message: "required on Vercel deployments",
        })
      }
    }
  })

export type ServerEnv = z.infer<typeof ServerEnvSchema>

export const serverEnv: ServerEnv = ServerEnvSchema.parse(process.env)
