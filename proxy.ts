import { NextResponse, type NextRequest } from "next/server"

import { PROTECTED_ROUTES, PUBLIC_ROUTES, ROUTES } from "@/shared/config/routes"

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = request.cookies.get("session")?.value != null

  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
  const isPublic = PUBLIC_ROUTES.some((route) => pathname === route)

  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL(ROUTES.login, request.nextUrl))
  }
  if (isPublic && hasSession) {
    return NextResponse.redirect(new URL(ROUTES.dashboard, request.nextUrl))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
