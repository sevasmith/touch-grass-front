import { describe, expect, it } from "vitest"

import { VerifyEmailSchema } from "./verify-email.schema"

describe("VerifyEmailSchema", () => {
  it("accepts six digits and keeps a leading zero (string, FR-017)", () => {
    expect(VerifyEmailSchema.parse({ code: "012345" })).toEqual({
      code: "012345",
    })
  })

  it.each(["12345", "1234567", "12a456", "", " 12345", "１２３４５６"])(
    "rejects %j",
    (code) => {
      const result = VerifyEmailSchema.safeParse({ code })
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toBe("Enter the 6-digit code")
    }
  )

  it("rejects a number", () => {
    expect(VerifyEmailSchema.safeParse({ code: 123456 }).success).toBe(false)
  })
})
