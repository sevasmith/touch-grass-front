import { RESEND_COOLDOWN_MS } from "../config/verification"

/** When the resend cooldown ends, or null if no code was sent within the last 60 s. */
export function getCooldownEndsAt(
  codeSentAtMs: number | null,
  nowMs: number
): number | null {
  if (codeSentAtMs === null) return null
  const endsAt = codeSentAtMs + RESEND_COOLDOWN_MS
  return endsAt > nowMs ? endsAt : null
}

export function secondsRemaining(endsAtMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((endsAtMs - nowMs) / 1000))
}
