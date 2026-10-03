import { OAuthCompletePage } from "@/_pages/oauth-complete"

export default function Page({ searchParams }: PageProps<"/oauth/complete">) {
  return <OAuthCompletePage searchParams={searchParams} />
}
