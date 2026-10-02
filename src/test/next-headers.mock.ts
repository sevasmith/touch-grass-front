import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies"

// In-memory stand-ins for `next/headers`. Wire them into a test file with:
//   vi.mock("next/headers", () => import("@/test/next-headers.mock"))
// and call `resetNextHeaders()` in `beforeEach`. The jar and headers below are
// module singletons, so the test file and the code under test see the same state.

export type CookieOptions = Partial<Omit<ResponseCookie, "name" | "value">>

interface StoredCookie {
  name: string
  value: string
}

export interface CookieSetCall extends StoredCookie {
  options: CookieOptions
}

export class CookieJar {
  private readonly store = new Map<string, StoredCookie>()
  /** Every `set` call in order, with the options it was given. */
  readonly setCalls: CookieSetCall[] = []
  /** Every cookie name passed to `delete`, in order. */
  readonly deleteCalls: string[] = []

  get(name: string): StoredCookie | undefined {
    return this.store.get(name)
  }

  getAll(): StoredCookie[] {
    return [...this.store.values()]
  }

  has(name: string): boolean {
    return this.store.has(name)
  }

  set(
    ...args:
      [name: string, value: string, options?: CookieOptions] | [ResponseCookie]
  ): this {
    const [name, value, options] =
      typeof args[0] === "string"
        ? [args[0], args[1] as string, (args[2] ?? {}) as CookieOptions]
        : splitCookie(args[0])
    this.setCalls.push({ name, value, options })
    this.store.set(name, { name, value })
    return this
  }

  delete(name: string): this {
    this.deleteCalls.push(name)
    this.store.delete(name)
    return this
  }

  /** Seed a cookie as if the browser had sent it (not recorded in `setCalls`). */
  seed(cookies: Record<string, string>): this {
    for (const [name, value] of Object.entries(cookies)) {
      this.store.set(name, { name, value })
    }
    return this
  }

  /** The options of the most recent `set` for `name`. */
  lastSet(name: string): CookieSetCall | undefined {
    return this.setCalls.findLast((call) => call.name === name)
  }

  reset(): void {
    this.store.clear()
    this.setCalls.length = 0
    this.deleteCalls.length = 0
  }
}

function splitCookie({
  name,
  value,
  ...options
}: ResponseCookie): [string, string, CookieOptions] {
  return [name, value, options]
}

export const cookieJar = new CookieJar()
export const headerStore = new Headers()

export function setForwardedFor(value: string | null): void {
  if (value === null) headerStore.delete("x-forwarded-for")
  else headerStore.set("x-forwarded-for", value)
}

export function resetNextHeaders(): void {
  cookieJar.reset()
  for (const key of [...headerStore.keys()]) headerStore.delete(key)
}

// Same names and async shape as `next/headers`.
export async function cookies(): Promise<CookieJar> {
  return cookieJar
}

export async function headers(): Promise<Headers> {
  return headerStore
}
