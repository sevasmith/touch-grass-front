import { ResetPasswordPage } from "@/_pages/reset-password"

interface Props {
  searchParams: Promise<{ token?: string | string[] }>
}

export default async function Page({ searchParams }: Props) {
  const params = await searchParams
  return (
    <ResetPasswordPage
      token={typeof params.token === "string" ? params.token : ""}
    />
  )
}
