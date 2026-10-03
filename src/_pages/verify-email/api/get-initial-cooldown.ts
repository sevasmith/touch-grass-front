import "server-only"

import { cookies } from "next/headers"

import { readCodeSentAt } from "@/entities/session"
import { getCooldownEndsAt } from "@/features/auth"

/** When the resend cooldown ends for this request, from the code-sent cookie (research R10). */
export async function getInitialCooldownEndsAt(): Promise<number | null> {
  return getCooldownEndsAt(readCodeSentAt(await cookies()), Date.now())
}
