import { useTRPCClient } from "@app-starter-kit/api-client"
import { createConnector } from "@app-starter-kit/powersync"
import { PowerSyncContext } from "@powersync/react"
import { type ReactNode, useEffect } from "react"
import { authClient } from "./auth-client"
import { getDb } from "./powersync-db"

// Provides the app-lifetime PowerSync database (see ./powersync-db) to its
// children, and keeps it connected while mounted. No SSR gymnastics here —
// React Native is always on-device.
//
// fetchCredentials is supplied here (not in the shared package): the Expo auth
// client stores/retrieves the session token, which we convert to a PowerSync
// credential with the configured endpoint.
export function PowerSyncProvider({ children }: { children: ReactNode }) {
  const trpc = useTRPCClient()
  const db = getDb()

  useEffect(() => {
    void db.connect(
      createConnector(trpc, async () => {
        const { data } = await authClient.token()
        if (!data?.token) throw new Error("Not authenticated — no PowerSync token")
        return {
          endpoint: process.env.EXPO_PUBLIC_POWERSYNC_URL ?? "http://localhost:8080",
          token: data.token,
        }
      }),
    )
    // On unmount (e.g. a transient session blip flipping to the auth screen),
    // just stop syncing — do NOT clear. The local rows and pending upload queue
    // must survive so an offline write isn't lost on a reconnect. Clearing
    // happens only on an explicit sign-out (see lib/auth-client).
    return () => {
      void db.disconnect()
    }
  }, [db, trpc])

  return <PowerSyncContext.Provider value={db}>{children}</PowerSyncContext.Provider>
}
