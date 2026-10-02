const FOOTER_ITEMS = ["Privacy Policy", "Terms of Service", "Contact"] as const

/** Static decoration (research: out-of-scope destinations), so none of it is a link. */
export function AuthFooter() {
  return (
    <footer className="flex flex-col items-center gap-1 py-6 text-center">
      <p className="text-xs leading-3 font-semibold tracking-[1.2px] text-link">
        © 2024 Touch Grass. All rights reserved.
      </p>
      <ul className="flex gap-4 text-sm leading-5 text-muted-foreground">
        {FOOTER_ITEMS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </footer>
  )
}
