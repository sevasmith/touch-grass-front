"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { Spinner } from "@/shared/ui/spinner"

import { exchangeOAuthToken } from "../api/exchange-oauth-token.action"
import { AUTH_ROUTES } from "../config/routes"
import type { AuthErrorCode } from "../model/auth-error"
import {
  OAUTH_PARAM_ERRORS,
  type OAuthCompleteParams,
} from "../model/oauth-complete-params.schema"
import { OAuthErrorCard } from "./OAuthErrorCard"

type HandlerState =
  { status: "exchanging" } | { status: "error"; code: AuthErrorCode }

/**
 * /oauth/complete (data-model §5): strips the single-use handoff token from the URL, then
 * exchanges it exactly once, even under StrictMode's double effects.
 */
export function OAuthCompleteHandler({
  params,
}: {
  params: OAuthCompleteParams
}) {
  const router = useRouter()
  const started = useRef(false)
  const [state, setState] = useState<HandlerState>(() =>
    params.kind === "token"
      ? { status: "exchanging" }
      : { status: "error", code: OAUTH_PARAM_ERRORS[params.error] }
  )

  useEffect(() => {
    if (started.current) return
    started.current = true
    window.history.replaceState(null, "", "/oauth/complete")
    if (params.kind !== "token") return

    exchangeOAuthToken({ token: params.token }).then(
      (result) => {
        if (result.ok) router.replace(result.redirectTo ?? AUTH_ROUTES.map)
        else setState({ status: "error", code: result.error })
      },
      (error: unknown) => {
        console.error("[oauth] exchange call failed", error)
        setState({ status: "error", code: "NETWORK_ERROR" })
      }
    )
  }, [params, router])

  if (state.status === "error") return <OAuthErrorCard code={state.code} />

  return (
    <div className="flex h-96 flex-col items-center justify-center gap-4">
      <Spinner className="size-6 text-primary" />
      <p className="text-base text-muted-foreground">Signing you in…</p>
    </div>
  )
}
