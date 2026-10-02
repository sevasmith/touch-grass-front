import "server-only"

import { headers } from "next/headers"
import type { z } from "zod"

import { serverEnv } from "@/shared/config/env.server"

import { parseApiError, type ApiError } from "./api-error.schema"

const TIMEOUT_MS = 8000

export type BackendResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; kind: "http"; status: number; error: ApiError }
  | { ok: false; kind: "invalid_response"; status: number }
  | { ok: false; kind: "network" }

export interface BackendFetchOptions<T> {
  method: "GET" | "POST"
  body?: unknown
  accessToken?: string
  /** Parses a 2xx body. Without it the body is ignored and `data` is `undefined`. */
  schema?: z.ZodType<T>
}

/**
 * Server-side call to the backend API. Never throws for HTTP or network failures; every outcome
 * is a `BackendResult` (constitution VIII). Logs carry method, path and status only.
 */
export async function backendFetch<T = undefined>(
  path: `/${string}`,
  { method, body, accessToken, schema }: BackendFetchOptions<T>
): Promise<BackendResult<T>> {
  const requestHeaders = new Headers()
  if (body !== undefined) requestHeaders.set("content-type", "application/json")
  if (accessToken !== undefined) {
    requestHeaders.set("authorization", `Bearer ${accessToken}`)
  }
  const clientIp = (await headers())
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim()
  if (clientIp) requestHeaders.set("x-forwarded-for", clientIp)

  let response: Response
  try {
    response = await fetch(`${serverEnv.NEXT_PUBLIC_API_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    })
  } catch {
    console.error("[backendFetch] network failure", { method, path })
    return { ok: false, kind: "network" }
  }

  const { status } = response

  if (!response.ok) {
    if (status >= 500)
      console.error("[backendFetch] server error", { method, path, status })
    const errorBody: unknown = await response.json().catch(() => undefined)
    return {
      ok: false,
      kind: "http",
      status,
      error: parseApiError(status, errorBody),
    }
  }

  if (schema === undefined) {
    return { ok: true, status, data: undefined as T }
  }

  const parsed = schema.safeParse(await response.json().catch(() => undefined))
  if (!parsed.success) {
    console.error("[backendFetch] invalid response", { method, path, status })
    return { ok: false, kind: "invalid_response", status }
  }
  return { ok: true, status, data: parsed.data }
}
