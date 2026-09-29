import { NextResponse, type NextRequest } from "next/server"

import { apiFetch } from "@/shared/api/client"
import { ROUTES } from "@/shared/config/routes"

/**
 * Handles the email verification link (`/api/auth/verify-email?token=…`).
 * Calls the backend to consume the single-use token and redirects the user.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")

  if (!token) {
    return NextResponse.redirect(
      new URL(`${ROUTES.checkEmail}?error=expired`, request.nextUrl)
    )
  }

  try {
    await apiFetch("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
  } catch {
    return NextResponse.redirect(
      new URL(`${ROUTES.checkEmail}?error=expired`, request.nextUrl)
    )
  }

  return NextResponse.redirect(new URL(ROUTES.dashboard, request.nextUrl))
}
