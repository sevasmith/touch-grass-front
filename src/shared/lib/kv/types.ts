/** Minimal key-value port behind the refresh coordinator (research R2). TTLs are milliseconds. */
export interface KeyValueStore {
  get(key: string): Promise<string | null>
  /** Sets the key only if it is absent. Returns whether it was set. */
  setNx(key: string, value: string, ttlMs: number): Promise<boolean>
  set(key: string, value: string, ttlMs: number): Promise<void>
  del(key: string): Promise<void>
}

export class KvError extends Error {
  override name = "KvError"
}
