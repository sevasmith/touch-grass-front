import "server-only"

import { serverEnv } from "@/shared/config/env.server"

import { createMemoryStore } from "./memory-store"
import type { KeyValueStore } from "./types"
import { createUpstashStore } from "./upstash-store"

const globalForKv = globalThis as typeof globalThis & {
  __touchGrassKvStore?: KeyValueStore
}

/** Upstash when configured (required on Vercel by env validation), otherwise in-memory. */
export function getKvStore(): KeyValueStore {
  globalForKv.__touchGrassKvStore ??= createStore()
  return globalForKv.__touchGrassKvStore
}

function createStore(): KeyValueStore {
  const { UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: token } =
    serverEnv
  if (url !== undefined && token !== undefined)
    return createUpstashStore({ url, token })
  return createMemoryStore()
}
