import "server-only"

import { getKvStore, type KeyValueStore } from "@/shared/lib/kv"

import { callRefresh } from "../api/refresh"
import {
  RefreshOutcomeRecordSchema,
  type RefreshOutcome,
} from "../model/refresh-outcome.schema"
import { decryptJson, encryptJson } from "./crypto"

// Single-flight, rotation-safe refresh across serverless instances (research R2,
// contracts/session-and-proxy.md). Replaying a rotated refresh token revokes every session of the
// user, so at most one POST /auth/refresh may ever run per old token.

const LOCK_TTL_MS = 10_000
const RESULT_TTL_MS = 30_000
const POLL_INTERVAL_MS = 100
const POLL_TIMEOUT_MS = 4_000

export interface RefreshDeps {
  store: KeyValueStore
  now: () => number
  sleep: (ms: number) => Promise<void>
}

interface Keys {
  lock: string
  result: string
}

const TRANSIENT = { kind: "transient" } as const

export async function refreshSession(
  oldRefreshToken: string,
  deps: Partial<RefreshDeps> = {}
): Promise<RefreshOutcome> {
  const { store = getKvStore(), now = Date.now, sleep = wait } = deps
  try {
    const hash = await sha256Hex(oldRefreshToken)
    const keys = { lock: `rt:lock:${hash}`, result: `rt:result:${hash}` }

    const cached = await readResult(store, keys)
    if (cached) return cached

    if (await store.setNx(keys.lock, crypto.randomUUID(), LOCK_TTL_MS)) {
      return await refreshAsWinner(store, keys, oldRefreshToken)
    }
    return await waitForWinner(store, keys, oldRefreshToken, now, sleep)
  } catch (error) {
    console.error("[refreshSession] coordination failed", errorName(error))
    return TRANSIENT
  }
}

async function refreshAsWinner(
  store: KeyValueStore,
  keys: Keys,
  oldRefreshToken: string
): Promise<RefreshOutcome> {
  const outcome = await callRefresh(oldRefreshToken)

  if (outcome.kind === "transient") {
    // The refresh token may still be valid: let the next request try again.
    await store.del(keys.lock).catch(() => undefined)
    return outcome
  }

  try {
    await store.set(keys.result, await encryptJson(outcome), RESULT_TTL_MS)
  } catch (error) {
    // The old token is already rotated; losing the new pair now would end the session.
    console.error(
      "[refreshSession] could not cache the outcome",
      errorName(error)
    )
  }
  return outcome
}

async function waitForWinner(
  store: KeyValueStore,
  keys: Keys,
  oldRefreshToken: string,
  now: () => number,
  sleep: (ms: number) => Promise<void>
): Promise<RefreshOutcome> {
  const deadline = now() + POLL_TIMEOUT_MS
  let retriedLock = false

  while (now() < deadline) {
    await sleep(POLL_INTERVAL_MS)

    const cached = await readResult(store, keys)
    if (cached) return cached

    // The winner gave up (transient failure) or died: take over once.
    if (!retriedLock && (await store.get(keys.lock)) === null) {
      retriedLock = true
      if (await store.setNx(keys.lock, crypto.randomUUID(), LOCK_TTL_MS)) {
        return refreshAsWinner(store, keys, oldRefreshToken)
      }
    }
  }
  return TRANSIENT
}

/** The cached outcome, `transient` if it exists but is unreadable, or null if there is none. */
async function readResult(
  store: KeyValueStore,
  keys: Keys
): Promise<RefreshOutcome | null> {
  const encrypted = await store.get(keys.result)
  if (encrypted === null) return null
  const parsed = RefreshOutcomeRecordSchema.safeParse(
    await decryptJson(encrypted)
  )
  return parsed.success ? parsed.data : TRANSIENT
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  )
  return Buffer.from(digest).toString("hex")
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "unknown"
}
