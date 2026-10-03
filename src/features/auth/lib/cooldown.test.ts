import { describe, expect, it } from "vitest"

import { getCooldownEndsAt, secondsRemaining } from "./cooldown"

const NOW = 1_790_000_000_000

describe("getCooldownEndsAt", () => {
  it("returns codeSentAt + 60 s while that is in the future", () => {
    expect(getCooldownEndsAt(NOW - 20_000, NOW)).toBe(NOW + 40_000)
  })

  it.each([
    ["absent", null],
    ["exactly elapsed", NOW - 60_000],
    ["long elapsed", NOW - 600_000],
  ])("returns null when the send time is %s", (_, sentAt) => {
    expect(getCooldownEndsAt(sentAt, NOW)).toBeNull()
  })
})

describe("secondsRemaining", () => {
  it.each([
    [NOW + 60_000, 60],
    [NOW + 59_001, 60],
    [NOW + 1, 1],
    [NOW, 0],
    [NOW - 5_000, 0],
  ])(
    "for endsAt %i returns %i (rounded up, never negative)",
    (endsAt, seconds) => {
      expect(secondsRemaining(endsAt, NOW)).toBe(seconds)
    }
  )
})
