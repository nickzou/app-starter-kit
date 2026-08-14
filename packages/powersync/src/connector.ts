import type { useTRPCClient } from "@app-starter-kit/api-client"
import type {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  PowerSyncCredentials,
} from "@powersync/common"
import { UpdateType } from "@powersync/common"

// The imperative tRPC client (from useTRPCClient) — the write path PowerSync
// replays local mutations through. No new backend: this is the same API the UI
// uses, now driven by the sync engine instead of the UI directly.
type TrpcClient = ReturnType<typeof useTRPCClient>

// How the connector authenticates with the PowerSync service. Kept as a callback
// so this package stays free of app-specific auth/config code (the web app wires
// its auth-client + config in; a future mobile app would wire its own).
export type FetchCredentials = () => Promise<PowerSyncCredentials>

// tRPC error codes that a retry can't fix (bad input, gone, not ours). We drop
// the offending change instead of blocking the upload queue forever. Everything
// else (offline, 5xx) is transient — we rethrow so PowerSync retries.
const FATAL_CODES = new Set(["BAD_REQUEST", "NOT_FOUND", "CONFLICT", "FORBIDDEN"])

function isFatal(err: unknown): boolean {
  const code =
    err && typeof err === "object" && "data" in err
      ? (err as { data?: { code?: string } }).data?.code
      : undefined
  return typeof code === "string" && FATAL_CODES.has(code)
}

// Build the connector PowerSync uses to talk to our backend. It needs two things:
// how to authenticate (fetchCredentials, supplied by the caller) and how to push
// local writes upstream (uploadData). Reads (the download path) are handled by
// the sync rules — nothing to do here.
export function createConnector(
  trpc: TrpcClient,
  fetchCredentials: FetchCredentials,
): PowerSyncBackendConnector {
  return {
    fetchCredentials,

    // Drain the local write queue one transaction at a time, mapping each row op
    // to the matching tRPC procedure. PowerSync calls this whenever there are
    // pending local changes and a connection is available.
    async uploadData(database: AbstractPowerSyncDatabase) {
      const tx = await database.getNextCrudTransaction()
      if (!tx) return

      try {
        for (const op of tx.crud) {
          if (op.table !== "notes") continue
          const data = op.opData ?? {}

          switch (op.op) {
            case UpdateType.PUT:
              // A locally-created note. create upserts on the client-minted id,
              // so a retried upload is idempotent.
              await trpc.notes.create.mutate({
                id: op.id,
                title: String(data.title ?? ""),
                body: String(data.body ?? ""),
              })
              break
            case UpdateType.PATCH:
              // A field change — send only what changed.
              await trpc.notes.update.mutate({
                id: op.id,
                ...(data.title !== undefined ? { title: String(data.title) } : {}),
                ...(data.body !== undefined ? { body: String(data.body) } : {}),
              })
              break
            case UpdateType.DELETE:
              // A local delete becomes a soft delete server-side; the tombstone
              // then removes the row from every device via the sync rules.
              await trpc.notes.softDelete.mutate({ id: op.id })
              break
          }
        }
        await tx.complete()
      } catch (err) {
        if (isFatal(err)) {
          // Can't ever succeed — drop this batch so the queue keeps moving.
          console.error("PowerSync: discarding un-uploadable change", err)
          await tx.complete()
          return
        }
        // Transient — leave it on the queue; PowerSync backs off and retries.
        throw err
      }
    },
  }
}
