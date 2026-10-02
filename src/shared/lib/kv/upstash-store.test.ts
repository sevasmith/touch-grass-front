// @vitest-environment node
import { describe, expect, it } from "vitest"

import { json, mockFetch } from "@/test/fetch.mock"

import { KvError } from "./types"
import { createUpstashStore } from "./upstash-store"

const URL = "https://eu1-x.upstash.io"
const store = () => createUpstashStore({ url: URL, token: "upstash-token" })

describe("createUpstashStore — requests", () => {
  it.each([
    ["get", () => store().get("k"), ["GET", "k"], { result: null }],
    [
      "setNx",
      () => store().setNx("k", "v", 10000),
      ["SET", "k", "v", "NX", "PX", 10000],
      { result: "OK" },
    ],
    [
      "set",
      () => store().set("k", "v", 30000),
      ["SET", "k", "v", "PX", 30000],
      { result: "OK" },
    ],
    ["del", () => store().del("k"), ["DEL", "k"], { result: 1 }],
  ] as const)(
    "%s POSTs the command array with the bearer token",
    async (_, op, command, response) => {
      const api = mockFetch({ "POST /": json(200, response) })

      await op()

      const [call] = api.calls("POST /")
      expect(call.url).toBe(`${URL}/`)
      expect(call.headers.get("authorization")).toBe("Bearer upstash-token")
      expect(call.body).toEqual(command)
    }
  )
})

describe("createUpstashStore — results", () => {
  it("get returns the string value", async () => {
    mockFetch({ "POST /": json(200, { result: "v" }) })
    expect(await store().get("k")).toBe("v")
  })

  it("get returns null for a missing key", async () => {
    mockFetch({ "POST /": json(200, { result: null }) })
    expect(await store().get("k")).toBeNull()
  })

  it("setNx returns true on OK", async () => {
    mockFetch({ "POST /": json(200, { result: "OK" }) })
    expect(await store().setNx("k", "v", 1000)).toBe(true)
  })

  it("setNx returns false on null (key already set)", async () => {
    mockFetch({ "POST /": json(200, { result: null }) })
    expect(await store().setNx("k", "v", 1000)).toBe(false)
  })
})

describe("createUpstashStore — failures throw KvError", () => {
  it("on an { error } body", async () => {
    mockFetch({ "POST /": json(200, { error: "WRONGPASS invalid password" }) })
    await expect(store().get("k")).rejects.toBeInstanceOf(KvError)
  })

  it("on a non-2xx response", async () => {
    mockFetch({ "POST /": json(401, { error: "Unauthorized" }) })
    await expect(store().set("k", "v", 1000)).rejects.toBeInstanceOf(KvError)
  })

  it("on a network failure", async () => {
    mockFetch({ "POST /": new TypeError("fetch failed") })
    await expect(store().del("k")).rejects.toBeInstanceOf(KvError)
  })

  it("on a body that is neither { result } nor { error }", async () => {
    mockFetch({ "POST /": json(200, { nope: true }) })
    await expect(store().setNx("k", "v", 1000)).rejects.toBeInstanceOf(KvError)
  })

  it("on a get result that is not a string or null", async () => {
    mockFetch({ "POST /": json(200, { result: 42 }) })
    await expect(store().get("k")).rejects.toBeInstanceOf(KvError)
  })
})
