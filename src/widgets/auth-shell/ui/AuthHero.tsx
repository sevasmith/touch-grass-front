import Image from "next/image"

/** Left half of Figma 1:2: decorative photo and title, hidden below `lg`. */
export function AuthHero() {
  return (
    <div
      data-slot="auth-hero"
      className="relative hidden flex-1 overflow-hidden bg-hero-fallback lg:block"
    >
      <Image
        src="/images/auth-hero.jpg"
        alt=""
        fill
        priority
        sizes="50vw"
        className="object-cover"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="font-heading text-[80px] leading-[100px] font-semibold text-white [text-shadow:0_2px_4px_#0003]">
          Touch Grass
        </p>
      </div>
    </div>
  )
}
