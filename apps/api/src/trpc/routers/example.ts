import { protectedProcedure, publicProcedure, router } from "../init"

// A tiny, domain-free example wired end-to-end so the tRPC client/server and the
// auth context are demonstrably working out of the box. Replace this with your
// own routers (and delete it) once you start building.
export const exampleRouter = router({
  // Public: no auth required — anyone can call it.
  ping: publicProcedure.query(() => ({ ok: true, at: new Date().toISOString() })),

  // Protected: requires a valid session; returns the caller's user id. Demonstrates
  // that protectedProcedure + the Better Auth session context work end-to-end.
  whoami: protectedProcedure.query(({ ctx }) => ({ userId: ctx.userId })),
})
