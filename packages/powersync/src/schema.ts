import { column, Schema, Table } from "@powersync/common"

// The on-device SQLite mirror of the synced `notes` rows, defined once here (via
// the SDK-agnostic @powersync/common) so every surface — web, desktop, and mobile
// — shares one schema and can't drift.
//
// A few PowerSync/SQLite realities shape this:
//   - every table gets an implicit text `id` (the uuid), so we don't declare it
//   - we omit `user_id`: the sync rules already scope rows to the signed-in user,
//     so every row on this device is already ours
//   - we omit `deleted_at`: soft-deleted rows fall out of the sync stream, so the
//     device simply never has them
//   - SQLite has no timestamp type — timestamps are stored as ISO strings
const notes = new Table({
  title: column.text,
  body: column.text,
  created_at: column.text,
  updated_at: column.text,
})

export const AppSchema = new Schema({ notes })
