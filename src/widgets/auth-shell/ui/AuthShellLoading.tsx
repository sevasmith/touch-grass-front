import { Spinner } from "@/shared/ui/spinner"

/** Fixed-height placeholder for the form column, so nothing shifts when the page arrives. */
export function AuthShellLoading() {
  return (
    <div
      data-slot="auth-shell-loading"
      className="flex h-96 items-center justify-center"
    >
      <Spinner className="size-6 text-primary" />
    </div>
  )
}
