import { z } from "zod"

// A Note — a generic synced resource. Defined once, here. This same schema
// validates API input, infers the frontend types, and mirrors the DB table.
// Change the shape once and the whole stack follows.
//
// Sync-ready by construction (the offline-first disciplines, baked in):
//   - id:        a client-minted uuid, so a device can create notes offline
//   - updatedAt: lets sync answer "what changed since?"
//   - deletedAt: a tombstone, so a delete propagates instead of a row vanishing
export const noteSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  body: z.string().default(""),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
})

export type Note = z.infer<typeof noteSchema>

// What a client supplies to create a note. `id` is optional: PowerSync clients
// mint the uuid locally so a note created offline has a stable identity before
// it ever reaches the server; callers that omit it get a DB-minted id. Timestamps
// stay server-owned. Derived from noteSchema so it can never drift from it.
export const newNoteSchema = noteSchema
  .pick({
    title: true,
    body: true,
  })
  .extend({ id: noteSchema.shape.id.optional() })

export type NewNote = z.infer<typeof newNoteSchema>

// A partial update: `id` names the row; any mutable field may be set, and an
// omitted field is left unchanged — so no defaults here (a default would blank a
// field you didn't send). `title` mirrors noteSchema's rule.
export const updateNoteSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  body: z.string().optional(),
})

export type UpdateNote = z.infer<typeof updateNoteSchema>

// Identifies a single note by id (used by softDelete).
export const noteIdSchema = z.object({ id: z.string().uuid() })
