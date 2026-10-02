import type { KeyValueStore } from "./types"

interface Entry {
  value: string
  expiresAt: number
}

// Kept on globalThis so dev-server module reloads share one store per process.
const globalForKv = globalThis as typeof globalThis & {
  __touchGrassMemoryKv?: Map<string, Entry>
}

/** Single-process store for local dev, local `next start`, and tests. */
export function createMemoryStore(): KeyValueStore {
  const entries = (globalForKv.__touchGrassMemoryKv ??= new Map())

  const live = (key: string): Entry | undefined => {
    const entry = entries.get(key)
    if (entry && entry.expiresAt <= Date.now()) {
      entries.delete(key)
      return undefined
    }
    return entry
  }

  return {
    async get(key) {
      return live(key)?.value ?? null
    },
    async setNx(key, value, ttlMs) {
      if (live(key)) return false
      entries.set(key, { value, expiresAt: Date.now() + ttlMs })
      return true
    },
    async set(key, value, ttlMs) {
      entries.set(key, { value, expiresAt: Date.now() + ttlMs })
    },
    async del(key) {
      entries.delete(key)
    },
  }
}
