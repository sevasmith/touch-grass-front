export const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/check-email",
] as const

export const PROTECTED_ROUTES = ["/dashboard"] as const

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  checkEmail: "/check-email",
  dashboard: "/dashboard",
} as const
