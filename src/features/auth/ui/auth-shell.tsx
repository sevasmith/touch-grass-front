import type { ReactNode } from "react"

interface AuthShellProps {
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}

/**
 * Shared two-column layout for all auth pages: a decorative "Touch Grass"
 * brand panel (hidden below the `md` breakpoint, per SC-007/FR-003) and a
 * centered form column.
 */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-1/2 flex-col justify-between bg-muted p-10 md:flex">
        <p className="text-2xl font-semibold tracking-tight">Touch Grass</p>
        <p className="text-sm text-muted-foreground">
          Get outside. Connect with the people and places around you.
        </p>
      </aside>

      <main className="flex w-full flex-col justify-center px-6 py-12 md:w-1/2 md:px-16">
        <p className="mb-8 text-xl font-semibold tracking-tight md:hidden">
          Touch Grass
        </p>
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          ) : null}
          <div className="mt-6">{children}</div>
          {footer ? <div className="mt-8 text-sm">{footer}</div> : null}
        </div>
      </main>
    </div>
  )
}
