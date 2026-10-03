import { ResetPasswordPage } from "@/_pages/reset-password"

export default function Page({ searchParams }: PageProps<"/reset-password">) {
  return <ResetPasswordPage searchParams={searchParams} />
}
