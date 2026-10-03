import Link from "next/link"

export function BackToLoginLink({
  label = "Back to log in",
}: {
  label?: string
}) {
  return (
    <Link
      href="/login"
      className="self-center text-sm leading-5 font-semibold text-link underline-offset-4 hover:underline"
    >
      {label}
    </Link>
  )
}
