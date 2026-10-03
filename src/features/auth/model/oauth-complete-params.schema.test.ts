import { describe, expect, it } from "vitest"

import { parseOAuthCompleteParams } from "./oauth-complete-params.schema"

type Params = Record<string, string | string[] | undefined>

describe("parseOAuthCompleteParams", () => {
  it("returns the handoff token", () => {
    expect(parseOAuthCompleteParams({ token: "x" })).toEqual({
      kind: "token",
      token: "x",
    })
  })

  it.each([
    "access_denied",
    "email_already_in_use",
    "too_many_requests",
    "oauth_failed",
  ])("returns the %s error", (error) => {
    expect(parseOAuthCompleteParams({ error })).toEqual({
      kind: "error",
      error,
    })
  })

  it.each<[string, Params]>([
    ["an unknown error", { error: "server_on_fire" }],
    ["an empty token", { token: "" }],
    ["no params", {}],
    ["an empty token with an unknown error", { token: "", error: "nope" }],
  ])("falls back to oauth_failed for %s", (_, params) => {
    expect(parseOAuthCompleteParams(params)).toEqual({
      kind: "error",
      error: "oauth_failed",
    })
  })

  it("uses the first value of an array-valued param", () => {
    expect(parseOAuthCompleteParams({ token: ["a", "b"] })).toEqual({
      kind: "token",
      token: "a",
    })
    expect(parseOAuthCompleteParams({ error: ["access_denied", "x"] })).toEqual(
      {
        kind: "error",
        error: "access_denied",
      }
    )
  })

  it("falls back to oauth_failed for an array whose first value is invalid", () => {
    expect(
      parseOAuthCompleteParams({ error: ["nope", "access_denied"] })
    ).toEqual({
      kind: "error",
      error: "oauth_failed",
    })
    expect(parseOAuthCompleteParams({ token: [] })).toEqual({
      kind: "error",
      error: "oauth_failed",
    })
  })
})
