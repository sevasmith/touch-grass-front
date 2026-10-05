import { cookies } from "next/headers"

import { readHandoffToken } from "@/entities/session"
import { OAuthCompleteHandler, parseOAuthCompleteParams } from "@/features/auth"

interface OAuthCompletePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** The proxy has already moved `?token=` into a cookie, so it is read from there. */
export async function OAuthCompletePage({
  searchParams,
}: OAuthCompletePageProps) {
  const { error } = await searchParams
  const token = readHandoffToken(await cookies(), "/oauth/complete")

  return (
    <OAuthCompleteHandler params={parseOAuthCompleteParams({ token, error })} />
  )
}
