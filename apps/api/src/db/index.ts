import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { env } from "../env"
import * as notesSchema from "./notes"
import * as authSchema from "./schema"

// postgres.js connects lazily on first query, so importing this is cheap.
const client = postgres(env.DATABASE_URL)

// Both schema files (auth tables + our notes table) so Drizzle knows every table.
export const db = drizzle(client, { schema: { ...authSchema, ...notesSchema } })
