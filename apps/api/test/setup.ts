import { fileURLToPath } from "node:url"
import { config } from "dotenv"

// Load repo-root .env (DATABASE_URL + auth vars) for local runs, without
// overriding anything CI already set in the environment.
config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) })

// Force every test onto the dedicated app_starter_kit_test database — never the
// dev one.
const base =
  process.env.DATABASE_URL ??
  "postgresql://app_starter_kit:app_starter_kit@localhost:5432/app_starter_kit"
const url = new URL(base)
url.pathname = "/app_starter_kit_test"
process.env.DATABASE_URL = url.toString()

// Safety net: these tests may TRUNCATE tables, so refuse to run anywhere else.
if (!process.env.DATABASE_URL.endsWith("/app_starter_kit_test")) {
  throw new Error(
    `Refusing to run: DATABASE_URL is ${process.env.DATABASE_URL}, expected the app_starter_kit_test database.`,
  )
}
