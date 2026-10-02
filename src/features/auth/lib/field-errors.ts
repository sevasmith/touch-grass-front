import type { z } from "zod"

/** The first message per top-level field, for `ActionResult.fieldErrors`. */
export function toFieldErrors(
  error: z.ZodError
): Partial<Record<string, string>> {
  const fieldErrors: Partial<Record<string, string>> = {}
  for (const issue of error.issues) {
    const field = issue.path[0]
    if (typeof field === "string" && fieldErrors[field] === undefined) {
      fieldErrors[field] = issue.message
    }
  }
  return fieldErrors
}
