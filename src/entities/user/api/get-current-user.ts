import "server-only"

import { backendFetch } from "@/shared/api/backend-fetch"

import {
  CurrentUserSchema,
  type CurrentUser,
} from "../model/current-user.schema"

export type GetCurrentUserResult =
  | { ok: true; user: CurrentUser }
  | { ok: false; reason: "unauthorized" | "transient" }

/**
 * `GET /auth/me` with the given access token. Takes the token as an argument so this entity never
 * imports `entities/session` (constitution II). Anything but a 401 counts as transient.
 */
export async function getCurrentUser(
  accessToken: string
): Promise<GetCurrentUserResult> {
  const result = await backendFetch("/auth/me", {
    method: "GET",
    accessToken,
    schema: CurrentUserSchema,
  })
  if (result.ok) return { ok: true, user: result.data }
  if (result.kind === "http" && result.status === 401)
    return { ok: false, reason: "unauthorized" }
  return { ok: false, reason: "transient" }
}
