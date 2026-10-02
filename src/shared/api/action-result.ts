import type { Route } from "next"

/** The serializable result every Server Action returns to the browser (data-model §4). */
export type ActionResult<
  TSuccess extends object = { redirectTo?: Route },
  TError extends string = string,
> =
  | ({ ok: true } & TSuccess)
  | { ok: false; error: TError; fieldErrors?: Partial<Record<string, string>> }
