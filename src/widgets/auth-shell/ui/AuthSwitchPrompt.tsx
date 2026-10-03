import type { Route } from "next"
import Link from "next/link"

interface AuthSwitchPromptProps {
  prompt: string
  linkLabel: string
  href: Route
}

/** "Don't have an account? Sign up" line under the auth forms (Figma 1:2). */
export function AuthSwitchPrompt({
  prompt,
  linkLabel,
  href,
}: AuthSwitchPromptProps) {
  return (
    <p className="pt-3 text-center text-sm leading-5 text-muted-foreground">
      {prompt}{" "}
      <Link
        href={href}
        className="font-semibold text-link underline-offset-4 hover:underline"
      >
        {linkLabel}
      </Link>
    </p>
  )
}
