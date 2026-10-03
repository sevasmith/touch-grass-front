import { publicEnv } from "@/shared/config/env.public"

/** Top-level navigation target that starts Google sign-in; never fetched (FR-022). */
export const GOOGLE_START_URL = `${publicEnv.NEXT_PUBLIC_API_URL}/auth/google`
