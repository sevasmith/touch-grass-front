import { getSessionToken } from "./session"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ""

export interface ApiErrorBody {
  message?: string
  code?: string
  fieldErrors?: Record<string, string[]>
}

export class ApiError extends Error {
  readonly status: number
  readonly body: ApiErrorBody

  constructor(status: number, body: ApiErrorBody) {
    super(body.message ?? `Request failed with status ${status}`)
    this.name = "ApiError"
    this.status = status
    this.body = body
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = await getSessionToken()
  const headers = new Headers(init.headers)
  if (token) headers.set("Authorization", `Bearer ${token}`)
  if (init.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers })
  } catch {
    throw new ApiError(0, { message: "Network error" })
  }

  if (!res.ok) {
    let body: ApiErrorBody
    try {
      body = (await res.json()) as ApiErrorBody
    } catch {
      body = { message: res.statusText || "Request failed" }
    }
    throw new ApiError(res.status, body)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
