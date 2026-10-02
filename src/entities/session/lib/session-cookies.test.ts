// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CookieJar } from "@/test/next-headers.mock"

import {
  clearSession,
  readCodeSentAt,
  readSession,
  writeCodeSentAt,
  writeTokenPair,
} from "./session-cookies"

let jar: CookieJar

beforeEach(() => {
  jar = new CookieJar()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("readSession", () => {
  it("returns both tokens when tg_at and tg_rt exist", () => {
    jar.seed({ tg_at: "at-1", tg_rt: "rt-1" })
    expect(readSession(jar)).toEqual({
      accessToken: "at-1",
      refreshToken: "rt-1",
    })
  })

  it.each([
    {},
    { tg_at: "at-1" },
    { tg_rt: "rt-1" },
    { tg_at: "", tg_rt: "rt-1" },
  ])("returns null for %o", (cookies) => {
    jar.seed(cookies)
    expect(readSession(jar)).toBeNull()
  })
})

describe("writeTokenPair", () => {
  it("sets both cookies HttpOnly, Lax, path /, 30-day max age, not Secure outside production", () => {
    writeTokenPair(jar, { accessToken: "at-2", refreshToken: "rt-2" })

    const expected = {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 2592000,
      secure: false,
    }
    expect(jar.lastSet("tg_at")).toEqual({
      name: "tg_at",
      value: "at-2",
      options: expected,
    })
    expect(jar.lastSet("tg_rt")).toEqual({
      name: "tg_rt",
      value: "rt-2",
      options: expected,
    })
  })

  it("sets Secure in production", () => {
    vi.stubEnv("NODE_ENV", "production")

    writeTokenPair(jar, { accessToken: "at-2", refreshToken: "rt-2" })

    expect(jar.lastSet("tg_at")?.options.secure).toBe(true)
    expect(jar.lastSet("tg_rt")?.options.secure).toBe(true)
  })
})

describe("clearSession", () => {
  it("deletes tg_at, tg_rt and tg_code_sent_at", () => {
    jar.seed({ tg_at: "at-1", tg_rt: "rt-1", tg_code_sent_at: "1", other: "x" })

    clearSession(jar)

    expect(jar.deleteCalls.sort()).toEqual([
      "tg_at",
      "tg_code_sent_at",
      "tg_rt",
    ])
    expect(jar.getAll()).toEqual([{ name: "other", value: "x" }])
  })
})

describe("code-sent-at cookie", () => {
  it("writeCodeSentAt sets tg_code_sent_at with a 15-minute max age", () => {
    writeCodeSentAt(jar, 1_700_000_000_000)

    expect(jar.lastSet("tg_code_sent_at")).toEqual({
      name: "tg_code_sent_at",
      value: "1700000000000",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 900,
        secure: false,
      },
    })
  })

  it("readCodeSentAt returns the stored epoch ms", () => {
    jar.seed({ tg_code_sent_at: "1700000000000" })
    expect(readCodeSentAt(jar)).toBe(1_700_000_000_000)
  })

  it.each(["", "abc", "12abc", "-5", "1.5"])(
    "readCodeSentAt returns null for %j",
    (value) => {
      jar.seed({ tg_code_sent_at: value })
      expect(readCodeSentAt(jar)).toBeNull()
    }
  )

  it("readCodeSentAt returns null without the cookie", () => {
    expect(readCodeSentAt(jar)).toBeNull()
  })
})
