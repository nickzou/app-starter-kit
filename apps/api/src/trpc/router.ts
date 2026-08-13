import { router } from "./init"
import { exampleRouter } from "./routers/example"

export const appRouter = router({
  example: exampleRouter,
})

// The single type the clients import (@app-starter-kit/api/router) to get
// end-to-end type safety against this server — no codegen, no duplication.
export type AppRouter = typeof appRouter
