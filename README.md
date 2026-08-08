# App Starter Kit

A monorepo starter for shipping the **same app to web, desktop, and mobile** off
one self-hosted backend — with **end-to-end tests wired up for all three
surfaces**. Generated from a working reference app; rename the placeholders (see
[Make it yours](#make-it-yours)) and build.

## What's inside

| Package | Path | What |
|---|---|---|
| `@app-starter-kit/web` | `apps/web` | TanStack Start web app (SSR); also the frontend the Tauri desktop shell wraps (`src-tauri/`) |
| `@app-starter-kit/api` | `apps/api` | Standalone Nitro API + Better Auth, Postgres via Drizzle |
| `@app-starter-kit/mobile` | `apps/mobile` | Expo / React Native app |
| `@app-starter-kit/tsconfig` | `packages/tsconfig` | Shared TypeScript base config |
| `@app-starter-kit/e2e` | `e2e` | Playwright end-to-end tests (web) |
| `@app-starter-kit/desktop-e2e` | `desktop-e2e` | WebdriverIO + tauri-driver end-to-end tests (desktop) |

**Auth:** one API, three clients — web uses cookies; desktop and mobile use
bearer tokens (native shells can't rely on cross-site cookies).

**Tooling:** pnpm workspaces + Turborepo, Biome, a Nix `flake.nix` dev shell
(Tauri toolchain, Playwright browsers, Maestro, WebKitWebDriver), Docker +
Traefik deploy and OpenTofu/Hetzner infra templates, Renovate.

## Quickstart

Prereqs: Node 24+, pnpm 11+, Docker, and Rust (for the desktop build). On
NixOS/Nix, `nix develop` provides the native toolchain.

```sh
cp .env.example .env                                   # then edit
docker compose up -d                                   # Postgres
pnpm install
pnpm --filter @app-starter-kit/api db:migrate
pnpm turbo dev --filter=@app-starter-kit/api --filter=@app-starter-kit/web
```

- **Desktop:** `pnpm --filter @app-starter-kit/web tauri dev`
- **Mobile:** `pnpm --filter @app-starter-kit/mobile start` — the native auth
  modules need an EAS dev build, so run `eas init` in `apps/mobile` first.

## Tests — e2e per surface

| Surface | Tool | Command |
|---|---|---|
| Web | Playwright | `pnpm --filter @app-starter-kit/e2e test` |
| Mobile | Maestro | `pnpm --filter @app-starter-kit/mobile test:e2e` (device/emulator) |
| Desktop | WebdriverIO + tauri-driver | `pnpm --filter @app-starter-kit/desktop-e2e test:build` |

Each drives its own real runtime; see `desktop-e2e/README.md` for the desktop
harness. CI runs web + desktop per-push and mobile nightly (`.github/workflows/`).

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
  `ORIGIN_CERT`, `ORIGIN_KEY`, plus `RENOVATE_TOKEN`.
- **Database / scheme** — the dev DB is `app_starter_kit`; the deep-link scheme
  is `appstarterkit://`. Rename to taste.

## License

Add one.
