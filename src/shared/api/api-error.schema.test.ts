import { describe, expect, it } from "vitest"

import { ApiErrorSchema, parseApiError } from "./api-error.schema"

describe("ApiErrorSchema", () => {
  it("accepts a string message", () => {
    const body = {
      statusCode: 401,
      message: "Invalid credentials",
      error: "Unauthorized",
    }
    expect(ApiErrorSchema.parse(body)).toEqual(body)
  })

  it("accepts a string[] message (400 validation errors)", () => {
    const body = {
      statusCode: 400,
      message: ["email must be an email", "password too short"],
      error: "Bad Request",
    }
    expect(ApiErrorSchema.parse(body)).toEqual(body)
  })

  it.each([399, 600, 200, 401.5])("rejects statusCode %s", (statusCode) => {
    expect(
      ApiErrorSchema.safeParse({ statusCode, message: "x", error: "x" }).success
    ).toBe(false)
  })
})

describe("parseApiError", () => {
  it("returns the parsed body when it matches", () => {
    expect(
      parseApiError(409, {
        statusCode: 409,
        message: "Email taken",
        error: "Conflict",
      })
    ).toEqual({ statusCode: 409, message: "Email taken", error: "Conflict" })
  })

  it.each([undefined, null, "oops", { message: 1 }, { statusCode: 200 }])(
    "falls back to an Unknown error for an unparseable body (%o)",
    (body) => {
      expect(parseApiError(502, body)).toEqual({
        statusCode: 502,
        message: "",
        error: "Unknown",
      })
    }
  )
})
