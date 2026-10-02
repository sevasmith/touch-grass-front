import { LogoutButton } from "@/features/auth"

/** Placeholder for the protected map (out of scope for this feature). */
export function MapPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4">
      <h1 className="font-heading text-[32px] leading-[38.4px] font-bold">
        Map coming soon
      </h1>
      <LogoutButton />
    </main>
  )
}
