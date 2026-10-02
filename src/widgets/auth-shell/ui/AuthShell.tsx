import type { ReactNode } from "react"
import Image from "next/image"

import { AuthFooter } from "./AuthFooter"
import { AuthHero } from "./AuthHero"

/** Split-screen layout shared by every auth screen (Figma 1:2). */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh w-full">
      <AuthHero />
      <div className="flex flex-1 flex-col bg-background">
        <main className="flex flex-1 items-center justify-center px-4 pt-16 pb-8 lg:p-20">
          <div className="w-full max-w-auth">{children}</div>
        </main>
        <AuthFooter />
      </div>
      <Image
        src="/icons/help.svg"
        alt=""
        aria-hidden="true"
        width={20}
        height={20}
        className="absolute top-4 right-7"
      />
    </div>
  )
}
