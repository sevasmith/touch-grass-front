import { logout } from "../api/logout.action"
import { LogoutSubmit } from "./LogoutSubmit"

interface LogoutPromptProps {
  prompt: string
  linkLabel: string
}

/**
 * "Wrong email? Log out" line, styled like the auth switch prompt. An unverified session is
 * bounced from /login and /register back to /verify-email, so logging out is the way off it.
 */
export function LogoutPrompt({ prompt, linkLabel }: LogoutPromptProps) {
  return (
    <form
      action={logout}
      className="pt-3 text-center text-sm leading-5 text-muted-foreground"
    >
      {prompt} <LogoutSubmit appearance="link">{linkLabel}</LogoutSubmit>
    </form>
  )
}
