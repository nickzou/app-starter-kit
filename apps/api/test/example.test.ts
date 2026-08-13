import { TRPCError } from "@trpc/server"
import { describe, expect, it } from "vitest"
import { db } from "../src/db"
import { createCallerFactory } from "../src/trpc/init"
import { appRouter } from "../src/trpc/router"

// Sample integration test for the example router. Demonstrates the tRPC test
// harness (a caller over a real context) — replace with tests for your own
// routers. ping/whoami don't touch the DB, so this exercises the plumbing, not
// queries; the shared test database is still provisioned by global-setup.
const createCaller = createCallerFactory(appRouter)

describe("example router", () => {
  it("ping returns ok with a timestamp", async () => {
    const caller = createCaller({ db, userId: null })
    const res = await caller.example.ping()
    expect(res.ok).toBe(true)
    expect(typeof res.at).toBe("string")
  })

  it("whoami rejects an unauthenticated caller", async () => {
    const caller = createCaller({ db, userId: null })
    await expect(caller.example.whoami()).rejects.toThrow(TRPCError)
  })

  it("whoami returns the user id when signed in", async () => {
    const caller = createCaller({ db, userId: "user_123" })
    expect(await caller.example.whoami()).toEqual({ userId: "user_123" })
  })
})
