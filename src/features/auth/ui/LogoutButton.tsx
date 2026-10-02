import { logout } from "../api/logout.action"
import { LogoutSubmit } from "./LogoutSubmit"

/** Plain form posting to the logout Server Action, so it works before hydration. */
export function LogoutButton() {
  return (
    <form action={logout}>
      <LogoutSubmit />
    </form>
  )
}
