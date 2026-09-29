import { Button } from "@/shared/components/ui/button"

const PROVIDERS = ["Google", "GitHub", "Discord"] as const

export function SocialPlaceholder() {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground">or continue with</p>
      <div className="flex w-full flex-col gap-2">
        {PROVIDERS.map((provider) => (
          <Button
            key={provider}
            type="button"
            variant="outline"
            disabled
            aria-label={`${provider} — Coming soon`}
          >
            {provider}
            <span className="text-xs text-muted-foreground">Coming soon</span>
          </Button>
        ))}
      </div>
    </div>
  )
}
