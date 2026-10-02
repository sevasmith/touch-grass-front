import "server-only"

import { backendFetch } from "@/shared/api/backend-fetch"

/** `POST /auth/logout`. Best effort: the caller clears cookies whatever happens. */
export async function revokeSession(refreshToken: string): Promise<void> {
  try {
    await backendFetch("/auth/logout", {
      method: "POST",
      body: { refreshToken },
    })
  } catch (error) {
    console.error(
      "[revokeSession] failed",
      error instanceof Error ? error.name : "unknown"
    )
  }
}
