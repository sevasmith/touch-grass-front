import { LoginPage } from "@/_pages/login"

export default function Page({ searchParams }: PageProps<"/login">) {
  return <LoginPage searchParams={searchParams} />
}
