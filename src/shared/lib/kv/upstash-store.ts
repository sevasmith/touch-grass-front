import "server-only"

import { z } from "zod"

import { KvError, type KeyValueStore } from "./types"

const UpstashResponseSchema = z.union([
  z.object({ error: z.string() }),
  z.object({ result: z.unknown() }),
])

const StringOrNull = z.string().nullable()
const OkOrNull = z.literal("OK").nullable()

interface UpstashConfig {
  url: string
  token: string
}

/** Upstash Redis over its REST API with plain `fetch` (no SDK; research R2). */
export function createUpstashStore({
  url,
  token,
}: UpstashConfig): KeyValueStore {
  async function command(args: (string | number)[]): Promise<unknown> {
    let response: Response
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(args),
        cache: "no-store",
      })
    } catch (cause) {
      throw new KvError(`Upstash ${args[0]} failed: network`, { cause })
    }
    if (!response.ok)
      throw new KvError(`Upstash ${args[0]} failed: ${response.status}`)

    const parsed = UpstashResponseSchema.safeParse(
      await response.json().catch(() => undefined)
    )
    if (!parsed.success)
      throw new KvError(`Upstash ${args[0]} failed: invalid response`)
    if ("error" in parsed.data)
      throw new KvError(`Upstash ${args[0]} failed: error reply`)
    return parsed.data.result
  }

  function expect<T>(schema: z.ZodType<T>, result: unknown, op: string): T {
    const parsed = schema.safeParse(result)
    if (!parsed.success)
      throw new KvError(`Upstash ${op} failed: unexpected result`)
    return parsed.data
  }

  return {
    async get(key) {
      return expect(StringOrNull, await command(["GET", key]), "GET")
    },
    async setNx(key, value, ttlMs) {
      const result = await command(["SET", key, value, "NX", "PX", ttlMs])
      return expect(OkOrNull, result, "SET NX") === "OK"
    },
    async set(key, value, ttlMs) {
      await command(["SET", key, value, "PX", ttlMs])
    },
    async del(key) {
      await command(["DEL", key])
    },
  }
}
