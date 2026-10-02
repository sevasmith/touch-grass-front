import { describe, expect, it } from "vitest"

import { getRouteTier } from "./route-tiers"

describe("getRouteTier", () => {
  it.each([
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/oauth/complete",
    "/session-unavailable",
  ])("%s is public", (pathname) => {
    expect(getRouteTier(pathname)).toBe("public")
  })

  it("/verify-email is unverified", () => {
    expect(getRouteTier("/verify-email")).toBe("unverified")
  })

  it.each([
    "/map",
    "/",
    "/settings",
    "/oauth",
    "/login/extra",
    "/verify-email/x",
  ])("%s defaults to verified", (pathname) => {
    expect(getRouteTier(pathname)).toBe("verified")
  })

  it.each([
    ["/login/", "public"],
    ["/oauth/complete/", "public"],
    ["/verify-email/", "unverified"],
    ["/map/", "verified"],
  ] as const)("normalises the trailing slash in %s", (pathname, tier) => {
    expect(getRouteTier(pathname)).toBe(tier)
  })
})
