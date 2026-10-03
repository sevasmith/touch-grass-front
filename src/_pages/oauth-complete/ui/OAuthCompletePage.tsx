import { OAuthCompleteHandler, parseOAuthCompleteParams } from "@/features/auth"

interface OAuthCompletePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function OAuthCompletePage({
  searchParams,
}: OAuthCompletePageProps) {
  return (
    <OAuthCompleteHandler
      params={parseOAuthCompleteParams(await searchParams)}
    />
  )
}
