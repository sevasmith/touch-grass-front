import { describe, expect, it } from "vitest"

import { CurrentUserSchema } from "./current-user.schema"

const user = {
  id: "3f1c2b9a-6a0e-4c8f-9b7d-2e5a1c4d8f00",
  email: "ada@example.com",
  emailVerified: false,
}

describe("CurrentUserSchema", () => {
  it("accepts a GET /auth/me body", () => {
    expect(CurrentUserSchema.parse(user)).toEqual(user)
  })

  it.each([
    ["a non-uuid id", { ...user, id: "42" }],
    ["an invalid email", { ...user, email: "ada" }],
    ["a missing emailVerified", { id: user.id, email: user.email }],
  ])("rejects %s", (_, body) => {
    expect(CurrentUserSchema.safeParse(body).success).toBe(false)
  })
})
