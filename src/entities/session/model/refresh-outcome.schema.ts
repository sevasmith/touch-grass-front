import { z } from "zod"

import { TokenPairSchema } from "./token-pair.schema"

const Ok = z.object({ kind: z.literal("ok"), pair: TokenPairSchema })
const Revoked = z.object({ kind: z.literal("revoked") })
const Transient = z.object({ kind: z.literal("transient") })

/** What the refresh coordinator caches (encrypted) under `rt:result:{hash}`. */
export const RefreshOutcomeRecordSchema = z.discriminatedUnion("kind", [
  Ok,
  Revoked,
])
export type RefreshOutcomeRecord = z.infer<typeof RefreshOutcomeRecordSchema>

/** What callers receive. `transient` is never cached. */
export const RefreshOutcomeSchema = z.discriminatedUnion("kind", [
  Ok,
  Revoked,
  Transient,
])
export type RefreshOutcome = z.infer<typeof RefreshOutcomeSchema>
