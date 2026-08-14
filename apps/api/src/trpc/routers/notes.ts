import { TRPCError } from "@trpc/server"
import { and, desc, eq, isNull } from "drizzle-orm"
import { notes } from "../../db/schema"
import { newNoteSchema, type Note, noteIdSchema, updateNoteSchema } from "../../domain"
import { protectedProcedure, router } from "../init"

// Map a DB row to the wire/domain Note: drop the DB-only `userId`, and convert
// the timestamptz Dates to ISO strings so the shape matches @app-starter-kit/validation's
// noteSchema. This mapper is also where any DB↔domain drift surfaces — as a
// type error on the returned object.
function toNote(row: typeof notes.$inferSelect): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
  }
}

// Every query is scoped to ctx.userId, so a user only ever touches their own
// notes — ownership is enforced in the WHERE clause, not trusted from input.
export const notesRouter = router({
  // Reads exclude tombstones: soft-deleted rows stay in the table (sync needs
  // them) but never surface. This habit starts with the very first query.
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(notes)
      .where(and(eq(notes.userId, ctx.userId), isNull(notes.deletedAt)))
      .orderBy(desc(notes.createdAt))
    return rows.map(toNote)
  }),

  // The client may mint the id (PowerSync offline creates); fall back to the DB
  // default when it's absent. Timestamps stay server-owned.
  //
  // When an id is supplied we upsert: PowerSync retries an upload whose ack was
  // lost, so a plain insert would hit a duplicate-key error on the retry. The
  // setWhere scopes the conflict update to the owner, so a guessed id can never
  // overwrite another user's row.
  create: protectedProcedure.input(newNoteSchema).mutation(async ({ ctx, input }) => {
    const values = {
      userId: ctx.userId,
      title: input.title,
      body: input.body,
    }
    const [row] = input.id
      ? await ctx.db
          .insert(notes)
          .values({ id: input.id, ...values })
          .onConflictDoUpdate({
            target: notes.id,
            set: { title: input.title, body: input.body },
            setWhere: eq(notes.userId, ctx.userId),
          })
          .returning()
      : await ctx.db.insert(notes).values(values).returning()
    if (!row) throw new TRPCError({ code: "CONFLICT" })
    return toNote(row)
  }),

  update: protectedProcedure.input(updateNoteSchema).mutation(async ({ ctx, input }) => {
    const { id, ...fields } = input
    const [row] = await ctx.db
      .update(notes)
      .set(fields)
      .where(and(eq(notes.id, id), eq(notes.userId, ctx.userId), isNull(notes.deletedAt)))
      .returning()
    if (!row) throw new TRPCError({ code: "NOT_FOUND" })
    return toNote(row)
  }),

  // Soft delete: stamp deletedAt, don't remove the row.
  softDelete: protectedProcedure.input(noteIdSchema).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .update(notes)
      .set({ deletedAt: new Date() })
      .where(and(eq(notes.id, input.id), eq(notes.userId, ctx.userId), isNull(notes.deletedAt)))
      .returning()
    if (!row) throw new TRPCError({ code: "NOT_FOUND" })
    return toNote(row)
  }),
})
