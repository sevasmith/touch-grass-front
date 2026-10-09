import "server-only"

import { serverEnv } from "@/shared/config/env.server"

// AES-256-GCM for the refresh-coordination cache (constitution: Session Storage exception).
// Output: base64(iv ‖ ciphertext+tag).

const IV_BYTES = 12
const TAG_BYTES = 16
const ALGORITHM = { name: "AES-GCM", length: 256 } as const

const globalForCrypto = globalThis as typeof globalThis & {
  __touchGrassSessionCacheKey?: Promise<CryptoKey>
}

let configuredKey: Promise<CryptoKey> | undefined

function getKey(): Promise<CryptoKey> {
  const raw = serverEnv.SESSION_CACHE_KEY
  if (raw !== undefined) {
    configuredKey ??= crypto.subtle.importKey(
      "raw",
      new Uint8Array(Buffer.from(raw, "base64")),
      ALGORITHM,
      false,
      ["encrypt", "decrypt"]
    )
    return configuredKey
  }
  // No key configured (env validation requires one only with Upstash): one random key per
  // process, which is enough because the memory store is per process too.
  globalForCrypto.__touchGrassSessionCacheKey ??= crypto.subtle.generateKey(
    ALGORITHM,
    false,
    ["encrypt", "decrypt"]
  )
  return globalForCrypto.__touchGrassSessionCacheKey
}

export async function encryptJson(value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const plaintext = new TextEncoder().encode(JSON.stringify(value))
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await getKey(),
    plaintext
  )
  return Buffer.concat([iv, new Uint8Array(ciphertext)]).toString("base64")
}

/** Returns the decrypted JSON value, or null for anything malformed, tampered, or foreign. */
export async function decryptJson(encoded: string): Promise<unknown> {
  try {
    const bytes = new Uint8Array(Buffer.from(encoded, "base64"))
    if (bytes.length < IV_BYTES + TAG_BYTES) return null
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytes.subarray(0, IV_BYTES) },
      await getKey(),
      bytes.subarray(IV_BYTES)
    )
    return JSON.parse(new TextDecoder().decode(plaintext))
  } catch {
    return null
  }
}
