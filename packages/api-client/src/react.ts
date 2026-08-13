import type { AppRouter } from "@app-starter-kit/api/router"
import { createTRPCContext } from "@trpc/tanstack-react-query"

// The tRPC + TanStack Query integration, created once and shared. A consumer
// wraps its tree in <TRPCProvider trpcClient={...} queryClient={...}> and then
// calls `const trpc = useTRPC()` to build typed query/mutation options, e.g.
//   useQuery(trpc.example.ping.queryOptions())
export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>()
