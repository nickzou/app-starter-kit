import { execSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { config } from "dotenv"
import postgres from "postgres"

// Create + migrate the dedicated app_starter_kit_test database once, before the
// suite. Mirrors the Playwright harness's global-setup.
export default async function globalSetup() {
  config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) })
  const base =
    process.env.DATABASE_URL ??
    "postgresql://app_starter_kit:app_starter_kit@localhost:5432/app_starter_kit"
  const testUrl = new URL(base)
  testUrl.pathname = "/app_starter_kit_test"

  // CREATE DATABASE can't run in a transaction, so use a plain connection to the base db.
  const admin = postgres(base, { max: 1 })
  const exists = await admin`SELECT 1 FROM pg_database WHERE datname = 'app_starter_kit_test'`
  if (exists.length === 0) await admin.unsafe("CREATE DATABASE app_starter_kit_test")
  await admin.end()

  execSync("pnpm --filter @app-starter-kit/api db:migrate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testUrl.toString() },
  })
}
