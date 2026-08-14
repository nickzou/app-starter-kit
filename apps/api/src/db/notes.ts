import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { user } from "./schema"

// The notes table — the placeholder synced resource for the offline-first
// (PowerSync) stack. It's the DB mirror of the on-device SQLite `notes` table
// (packages/powersync), plus the DB-only `userId` owner (a row belongs to
// exactly one user).
//
// Kept in its own file, NOT in schema.ts, because `pnpm auth:generate`
// regenerates schema.ts from the Better Auth config and would clobber anything
// hand-added there.
//
// Timestamps are real `timestamptz` (Drizzle Date mode); the API converts them
// to ISO strings at the edge to match the wire contract. `deletedAt` is a
// nullable tombstone — set on soft delete, filtered out of reads, and the signal
// PowerSync uses to remove a row from every device.
export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull().default(""),
    body: text("body").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("notes_user_id_idx").on(table.userId)],
)
