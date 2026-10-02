import { z } from "zod"

// The single shape of every backend error body (constitution: API Error Contract).
export const ApiErrorSchema = z.object({
  statusCode: z.int().min(400).max(599),
  message: z.union([z.string(), z.array(z.string())]),
  error: z.string(),
})

export type ApiError = z.infer<typeof ApiErrorSchema>

/** Parses a non-2xx body. Never throws: an unparseable body becomes an "Unknown" error. */
export function parseApiError(status: number, body: unknown): ApiError {
  const parsed = ApiErrorSchema.safeParse(body)
  if (parsed.success) return parsed.data
  return { statusCode: status, message: "", error: "Unknown" }
}
