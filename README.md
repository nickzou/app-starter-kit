# App Starter Kit

A monorepo starter for shipping the **same app to web, desktop, and mobile** off
one self-hosted backend — with **end-to-end tests wired up for all three
surfaces**, and **offline-first sync via PowerSync**. Generated from a working reference app; rename the placeholders (see
[Make it yours](#make-it-yours)) and build.

## What's inside

| Package | Path | What |
|---|---|---|
| `@app-starter-kit/web` | `apps/web` | TanStack Start web app (SSR); also the frontend the Tauri desktop shell wraps (`src-tauri/`) |
| `@app-starter-kit/api` | `apps/api` | Standalone Nitro API + Better Auth, Postgres via Drizzle |
| `@app-starter-kit/mobile` | `apps/mobile` | Expo / React Native app |
| `@app-starter-kit/powersync` | `packages/powersync` | Shared PowerSync schema and connector (web + mobile) |
| `@app-starter-kit/validation` | `packages/validation` | Shared Zod schemas (API input validation, type inference) |
| `@app-starter-kit/tsconfig` | `packages/tsconfig` | Shared TypeScript base config |
| `@app-starter-kit/e2e` | `e2e` | Playwright end-to-end tests (web) |
| `@app-starter-kit/desktop-e2e` | `desktop-e2e` | WebdriverIO + tauri-driver end-to-end tests (desktop) |

**Auth:** one API, three clients — web uses cookies; desktop and mobile use
bearer tokens (native shells can't rely on cross-site cookies).

**Offline-first:** PowerSync replicates a Postgres table to local SQLite on each device.
Clients read/write locally; changes sync bi-directionally in the background. Soft-delete
tombstones propagate deletions across all devices. See [Offline-first sync](#offline-first-sync).

**Tooling:** pnpm workspaces + Turborepo, Biome, a Nix `flake.nix` dev shell
(Tauri toolchain, Playwright browsers, Maestro, WebKitWebDriver), Docker +
Traefik deploy and OpenTofu/Hetzner infra templates, Renovate.

## Quickstart

Prereqs: Node 24+, pnpm 11+, Docker, and Rust (for the desktop build). On
NixOS/Nix, `nix develop` provides the native toolchain.

```sh
cp .env.example .env                                   # then edit
docker compose up -d                                   # Postgres + PowerSync
pnpm install
pnpm --filter @app-starter-kit/api db:migrate
pnpm turbo dev --filter=@app-starter-kit/api --filter=@app-starter-kit/web
```

- **Desktop:** `pnpm --filter @app-starter-kit/web tauri dev`
- **Mobile:** `pnpm --filter @app-starter-kit/mobile start` — the native auth
  modules need an EAS dev build, so run `eas init` in `apps/mobile` first.

## Offline-first sync

This starter kit includes **PowerSync** for offline-first synchronization:

- **Local SQLite** on every device (web via wa-sqlite, mobile via op-sqlite)
- **Synced resource:** Notes table — a placeholder you'll replace with your own domain
- **Bi-directional:** Local writes queue offline, sync upstream when connected
- **Tombstones:** Soft-delete (deletedAt) propagates deletions across all devices
- **Type-safe:** Shared schema via `@app-starter-kit/powersync`, one connector for web/mobile

### How offline-first works

1. User creates a note locally → inserted into local SQLite
2. PowerSync detects change → queues CRUD transaction
3. Connector replays via tRPC → idempotent upsert on backend (safe retries)
4. Backend stores, PowerSync replicates → other devices sync down
5. Delete → soft-delete (set deletedAt) → sync rules filter it out → removed from all devices

**No optimistic bookkeeping needed** — all devices converge automatically.

### Customizing the synced resource

The starter includes **notes** as a generic placeholder. To sync a different resource (e.g., todos):

1. **Backend:** Copy `apps/api/src/trpc/routers/notes.ts` → `todos.ts`, change schema/fields
2. **Schema:** Update `apps/api/src/db/schema.ts` (or create `apps/api/src/db/todos.ts`)
3. **Validation:** Copy `packages/validation/src/note.ts` → `todo.ts`, update schema
4. **Sync config:** Add new stream in `powersync/sync-config.yaml`
5. **Client schema:** Update `packages/powersync/src/schema.ts` (add todos table)
6. **Connector:** Add new case in `packages/powersync/src/connector.ts` dispatcher
7. **UI:** Replace `NoteList` with `TodoList` (your component)

Everything else (auth, offline durability, sync plumbing) stays unchanged.

## Tests — e2e per surface

| Surface | Tool | Command |
|---|---|---|
| Web | Playwright | `pnpm --filter @app-starter-kit/e2e test` |
| Mobile | Maestro | `pnpm --filter @app-starter-kit/mobile test:e2e` (device/emulator) |
| Desktop | WebdriverIO + tauri-driver | `pnpm --filter @app-starter-kit/desktop-e2e test:build` |

Each drives its own real runtime; see `desktop-e2e/README.md` for the desktop
harness. CI runs web + desktop per-push and mobile nightly (`.github/workflows/`).

## Deployment

The CI workflow (`deploy.yml`) is **currently disabled** — there's no production environment configured yet.
Check and e2e jobs remain enabled.

### To enable production deployment

When you have infrastructure ready:

1. **Set required GitHub secrets:**
   - `DEPLOY_SSH_KEY` — SSH private key for the deploy user on your host
   - `DEPLOY_HOST` — Hostname/IP of your production server (GitHub variable)
   - `ORIGIN_CERT` — Cloudflare origin certificate (if using Cloudflare)
   - `ORIGIN_KEY` — Cloudflare origin key (if using Cloudflare)

2. **Update the deploy job condition** in `.github/workflows/deploy.yml`:
   
   Change line ~78 from:
   ```yaml
   if: github.event_name == 'workflow_dispatch' && vars.PROD_DEPLOYMENT_ENABLED == 'true'
   ```
   
   To:
   ```yaml
   if: github.event_name == 'push' && github.ref == 'refs/heads/main'
   ```

3. **Configure infrastructure** (optional):
   - Update `deploy/docker-compose.yml` with your image registry and domain
   - Set up Traefik labels (host routing, TLS)
   - See `infra/` for OpenTofu templates (Hetzner example)

The deploy job:
- Builds Docker images for web (and optional API)
- Pushes to GHCR
- SSHes into your host and pulls/runs via docker-compose
- Ships Traefik config + TLS certs

## Make it yours

**Fastest path — `pnpm personalize`.** It prompts for your app name, scope, and
bundle id, then rewrites every placeholder below (`pnpm personalize --dry-run` to
preview). It cannot do the remote/secret bits, so it prints those as a checklist
when it finishes.

Or change them by hand — the placeholders, per new project:

- **App identity** — `apps/mobile/app.json` (`name`, `slug`, `scheme`, android
  `package`) and `apps/web/src-tauri/tauri.conf.json` (`productName`,
  `identifier`, window `title`). Bundle IDs are `com.example.appstarterkit.*` —
  use your own reverse-domain.
- **EAS** — run `eas init` in `apps/mobile` (the `extra.eas.projectId` was
  removed on purpose).
- **Deploy / infra** — `deploy/docker-compose.yml` (image `ghcr.io/your-org/…`,
  Traefik `Host(…)` = `example.com`), `infra/terraform.tfvars.example` →
  `terraform.tfvars`, and `infra/public_keys/deploy_key.pub` (your CI deploy
  key). CI secrets referenced in `.github/workflows/deploy.yml`: `DEPLOY_SSH_KEY`,
  `ORIGIN_CERT`, `ORIGIN_KEY`, plus `RENOVATE_TOKEN`. See [Deployment](#deployment) for step-by-step re-enablement.
- **Database / scheme** — the dev DB is `app_starter_kit`; the deep-link scheme
  is `appstarterkit://`. Rename to taste.

## License

Add one.
