/** Heading and subtitle at the top of every auth screen (Figma 1:2 typography). */
export function AuthPageHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <header className="flex flex-col gap-3">
      <h1 className="font-heading text-heading font-bold text-foreground">
        {title}
      </h1>
      <p className="text-base text-muted-foreground">{subtitle}</p>
    </header>
  )
}
