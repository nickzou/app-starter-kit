// Seed a single known-password test user via Better Auth (auth.api.signUpEmail —
// never raw SQL, so the password hash + auth tables are valid). Gives you an
// account to log in with locally without signing up each time. Idempotent:
// re-running against a database that already has the user is a no-op.
//
//   pnpm --filter @app-starter-kit/api db:seed
//
// Credentials are placeholders — change them, or delete this file, once you have
// your own accounts. This is also the natural home for fixture data later: add
// `db.insert(...)` calls after the user is created (and, with PowerSync, they'll
// replicate to clients).
import { auth } from "./auth"

const TEST_USER = {
  email: "test@example.com",
  password: "test-password-123",
  name: "Test User",
}

async function seed(): Promise<void> {
  try {
    await auth.api.signUpEmail({ body: { ...TEST_USER } })
    console.log(`[seed] created test user ${TEST_USER.email}`)
  } catch (err) {
    const code = (err as { body?: { code?: string } }).body?.code
    const message = err instanceof Error ? err.message : String(err)
    if (code === "USER_ALREADY_EXISTS" || /already exists/i.test(message)) {
      console.log(`[seed] test user ${TEST_USER.email} already exists — skipping`)
      return
    }
    throw err
  }
}

// postgres.js keeps the event loop alive, so exit explicitly once seeding is done.
seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed] failed:", err)
    process.exit(1)
  })
