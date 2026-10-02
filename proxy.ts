export { proxy } from "@/_app/proxy"

// Inline so Next can analyse it statically.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/|icons/).*)"],
}
