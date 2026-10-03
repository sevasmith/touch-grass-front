import { Separator } from "@/shared/ui/separator"

export function AuthDivider() {
  return (
    <div className="flex items-center gap-6">
      <Separator className="flex-1 bg-border/50" />
      <span className="text-sm leading-5 text-muted-foreground">or</span>
      <Separator className="flex-1 bg-border/50" />
    </div>
  )
}
