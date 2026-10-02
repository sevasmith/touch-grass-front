import "server-only"

import { backendFetch } from "@/shared/api/backend-fetch"

import type { RefreshOutcome } from "../model/refresh-outcome.schema"
import { TokenPairSchema } from "../model/token-pair.schema"

/**
 * One `POST /auth/refresh`. Only the refresh coordinator may call this: refresh tokens are
 * single-use, and replaying one revokes every session of the user.
 */
export async function callRefresh(
  refreshToken: string
): Promise<RefreshOutcome> {
  const result = await backendFetch("/auth/refresh", {
    method: "POST",
    body: { refreshToken },
    schema: TokenPairSchema,
  })
  if (result.ok) return { kind: "ok", pair: result.data }
  if (result.kind === "http" && result.status === 401)
    return { kind: "revoked" }
  return { kind: "transient" }
}
