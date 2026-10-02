import type { Metadata } from "next"
import { Hanken_Grotesk, Manrope } from "next/font/google"

import { Providers } from "@/_app/providers"
import { cn } from "@/shared/lib/utils"

import "@/_app/globals.css"

const manrope = Manrope({
  variable: "--font-manrope",
  weight: ["600", "700"],
  subsets: ["latin"],
})

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  weight: ["400", "600"],
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Touch Grass",
  description: "Touch Grass",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={cn(
        manrope.variable,
        hankenGrotesk.variable,
        "h-full antialiased"
      )}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
