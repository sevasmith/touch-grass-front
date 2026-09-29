import { ForgotPasswordPage } from "@/_pages/forgot-password"

interface Props {
  searchParams: Promise<{ sent?: string | string[] }>
}

export default async function Page({ searchParams }: Props) {
  const params = await searchParams
  return <ForgotPasswordPage sent={params.sent === "true"} />
}
