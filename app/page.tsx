import { redirect } from "next/navigation"

import { getSessionToken } from "@/shared/api/session"
import { ROUTES } from "@/shared/config/routes"

export default async function Home() {
  const token = await getSessionToken()
  if (token) {
    redirect(ROUTES.dashboard)
  }
  redirect(ROUTES.login)
}
