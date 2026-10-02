import { vi } from "vitest"

// Stubs `globalThis.fetch` with a route table keyed by "METHOD /pathname".
// The stub is removed after each test (`unstubGlobals: true` in vitest.config.ts).

export type FetchHandler =
  Response | Error | ((request: Request) => Response | Error)

/** One handler, or a sequence consumed in order whose last entry repeats. */
export type FetchRoute = FetchHandler | FetchHandler[]

export interface RecordedCall {
  method: string
  url: string
  headers: Headers
  body: unknown
}

export function json(status: number, body?: unknown): Response {
  return body === undefined
    ? new Response(null, { status })
    : Response.json(body, { status })
}

export function mockFetch(routes: Record<string, FetchRoute>) {
  const recorded: RecordedCall[] = []
  const hits = new Map<string, number>()

  const fetchStub = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      const url = new URL(request.url)
      const key = `${request.method} ${url.pathname}`
      const text = await request.text()

      recorded.push({
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: text === "" ? undefined : JSON.parse(text),
      })

      const route = routes[key]
      if (route === undefined) throw new Error(`Unmocked fetch: ${key}`)

      const hit = hits.get(key) ?? 0
      hits.set(key, hit + 1)
      const handler = Array.isArray(route)
        ? route[Math.min(hit, route.length - 1)]
        : route
      const result = typeof handler === "function" ? handler(request) : handler

      if (result instanceof Error) throw result
      return result.clone()
    }
  )

  vi.stubGlobal("fetch", fetchStub)

  return {
    fetch: fetchStub,
    /** Calls matching "METHOD /pathname", or every call when omitted. */
    calls(key?: string): RecordedCall[] {
      if (key === undefined) return recorded
      return recorded.filter(
        (call) => `${call.method} ${new URL(call.url).pathname}` === key
      )
    },
  }
}
