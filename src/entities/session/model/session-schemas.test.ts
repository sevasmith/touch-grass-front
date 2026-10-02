import { describe, expect, it } from "vitest"

import {
  RefreshOutcomeRecordSchema,
  RefreshOutcomeSchema,
} from "./refresh-outcome.schema"
import { TokenPairSchema } from "./token-pair.schema"

const pair = { accessToken: "at-1", refreshToken: "rt-1" }

describe("TokenPairSchema", () => {
  it("accepts two non-empty token strings", () => {
    expect(TokenPairSchema.parse(pair)).toEqual(pair)
  })

  it.each([
    { ...pair, accessToken: "" },
    { ...pair, refreshToken: "" },
    { accessToken: "at-1" },
    { ...pair, refreshToken: 1 },
  ])("rejects %o", (body) => {
    expect(TokenPairSchema.safeParse(body).success).toBe(false)
  })
})

describe("RefreshOutcomeRecordSchema", () => {
  it("accepts { kind: ok, pair } and { kind: revoked }", () => {
    expect(RefreshOutcomeRecordSchema.parse({ kind: "ok", pair })).toEqual({
      kind: "ok",
      pair,
    })
    expect(RefreshOutcomeRecordSchema.parse({ kind: "revoked" })).toEqual({
      kind: "revoked",
    })
  })

  it("rejects ok without a pair, and transient (never stored)", () => {
    expect(RefreshOutcomeRecordSchema.safeParse({ kind: "ok" }).success).toBe(
      false
    )
    expect(
      RefreshOutcomeRecordSchema.safeParse({ kind: "transient" }).success
    ).toBe(false)
  })
})

describe("RefreshOutcomeSchema", () => {
  it("additionally allows { kind: transient }", () => {
    expect(RefreshOutcomeSchema.parse({ kind: "transient" })).toEqual({
      kind: "transient",
    })
    expect(RefreshOutcomeSchema.parse({ kind: "revoked" })).toEqual({
      kind: "revoked",
    })
  })
})
