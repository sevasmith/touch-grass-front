import Link from "next/link"

import { AuthShell, LoginForm, SocialPlaceholder } from "@/features/auth"

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Contact", href: "/contact" },
] as const

export function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      description="Log in to your account."
      footer={
        <nav aria-label="Legal" className="space-y-2">
          <p>
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium underline underline-offset-4"
            >
              Sign up
            </Link>
          </p>
          <div className="flex flex-wrap gap-4">
            {LEGAL_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="text-muted-foreground underline underline-offset-4"
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
      }
    >
      <LoginForm />
      <div className="mt-4 text-right">
        <Link
          href="/forgot-password"
          className="text-sm underline underline-offset-4"
        >
          Forgot password?
        </Link>
      </div>
      <div className="mt-6">
        <SocialPlaceholder />
      </div>
    </AuthShell>
  )
}
