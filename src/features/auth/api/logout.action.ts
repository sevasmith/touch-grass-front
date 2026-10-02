"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { clearSession, readSession, revokeSession } from "@/entities/session"

import { AUTH_ROUTES } from "../config/routes"

/** FR-015: revoke on the backend (result ignored), always clear the cookies, go to /login. */
export async function logout(): Promise<void> {
  const store = await cookies()
  const session = readSession(store)
  if (session) await revokeSession(session.refreshToken)
  clearSession(store)
  redirect(AUTH_ROUTES.login)
}
