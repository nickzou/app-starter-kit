#!/usr/bin/env node
// Personalize this starter — rename the placeholder identity to your app.
//
//   node scripts/personalize.mjs                    # interactive
//   node scripts/personalize.mjs --dry-run          # preview, write nothing
//   node scripts/personalize.mjs --name "My App" --bundle com.acme.myapp \
//        [--scope @myapp] [--owner acme] [--domain myapp.com] [--yes]
//
// It rewrites the mechanical bits (package scope, display name, bundle ids, URL
// scheme, dev DB name). The things a script can't do — eas init, a deploy
// keypair, CI secrets — are printed as a checklist at the end.
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, extname, join, relative } from "node:path"
import { argv, exit, stdin, stdout } from "node:process"
import { createInterface } from "node:readline/promises"
import { fileURLToPath } from "node:url"

const SELF = fileURLToPath(import.meta.url)
const ROOT = join(dirname(SELF), "..")

const args = {}
for (let i = 2; i < argv.length; i++) {
  const a = argv[i]
  if (a === "--dry-run") args.dryRun = true
  else if (a === "--yes") args.yes = true
  else if (a.startsWith("--")) args[a.slice(2)] = argv[++i]
}

const kebab = (s) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
const compact = (s) => kebab(s).replace(/-/g, "")
const snake = (s) => kebab(s).replace(/-/g, "_")

async function collect() {
  let { name, bundle, scope, owner, domain } = args
  const need = !name || !bundle
  if (need && !args.yes) {
    const rl = createInterface({ input: stdin, output: stdout })
    name ||= (await rl.question('App display name (e.g. "My Cool App"): ')).trim()
    const slug = kebab(name)
    scope ||= (await rl.question(`Package scope [@${slug}]: `)).trim() || `@${slug}`
    bundle ||=
      (
        await rl.question(`Bundle id base, reverse-domain [com.example.${compact(name)}]: `)
      ).trim() || `com.example.${compact(name)}`
    owner ||=
      (await rl.question("GitHub owner for the deploy image [your-org]: ")).trim() || "your-org"
    domain ||= (await rl.question("Production domain [example.com]: ")).trim() || "example.com"
    rl.close()
  }
  if (!name || !bundle) {
    console.error("Need at least --name and --bundle (or run without --yes to be prompted).")
    exit(1)
  }
  const slug = kebab(name)
  return {
    name,
    slug,
    scope: `@${(scope || `@${slug}`).replace(/^@/, "")}`,
    bundle,
    cmpct: compact(name),
    snk: snake(name),
    owner: owner || "your-org",
    domain: domain || "example.com",
  }
}

function fileList() {
  const SKIP_DIRS = new Set([
    ".git",
    "node_modules",
    ".output",
    ".nitro",
    "target",
    "dist",
    ".expo",
    ".turbo",
    ".terraform",
  ])
  const SKIP_FILES = new Set(["pnpm-lock.yaml", "flake.lock"])
  const BIN = new Set([
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".ico",
    ".icns",
    ".webp",
    ".woff",
    ".woff2",
    ".ttf",
    ".lock",
  ])
  const out = []
  ;(function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) walk(p)
      } else if (p !== SELF && !SKIP_FILES.has(e.name) && !BIN.has(extname(e.name).toLowerCase())) {
        out.push(p)
      }
    }
  })(ROOT)
  return out
}

async function main() {
  const v = await collect()
  // Ordered — longest/most-specific placeholder first so none is partially eaten.
  const repls = [
    ["@app-starter-kit/", `${v.scope}/`],
    ["com.example.appstarterkit", v.bundle],
    ["appstarterkit", v.cmpct],
    ["app_starter_kit", v.snk],
    ["App Starter Kit", v.name],
    ["app-starter-kit", v.slug],
  ]
  if (v.owner !== "your-org") repls.push(["your-org", v.owner])
  if (v.domain !== "example.com") repls.push(["example.com", v.domain])

  const touched = []
  for (const f of fileList()) {
    const buf = readFileSync(f)
    if (buf.includes(0)) continue // binary
    let text = buf.toString("utf8")
    const orig = text
    for (const [from, to] of repls) text = text.split(from).join(to)
    if (text !== orig) {
      touched.push(relative(ROOT, f))
      if (!args.dryRun) writeFileSync(f, text)
    }
  }

  console.log(`\n${args.dryRun ? "[dry-run] would change" : "changed"} ${touched.length} files:`)
  for (const t of touched.sort()) console.log(`  ${t}`)
  console.log("\nmapping:")
  console.log(`  scope        @app-starter-kit              ->  ${v.scope}`)
  console.log(`  display      App Starter Kit               ->  ${v.name}`)
  console.log(`  slug         app-starter-kit               ->  ${v.slug}`)
  console.log(`  bundle base  com.example.appstarterkit     ->  ${v.bundle}`)
  console.log(`  scheme       appstarterkit                 ->  ${v.cmpct}`)
  console.log(`  dev db       app_starter_kit               ->  ${v.snk}`)
  if (v.owner !== "your-org")
    console.log(`  gh owner     your-org                      ->  ${v.owner}`)
  if (v.domain !== "example.com")
    console.log(`  domain       example.com                   ->  ${v.domain}`)

  if (args.dryRun) {
    console.log("\nDry run — nothing written.")
    return
  }
  console.log(`
Done. The rest is manual (a script can't do these for you):
  1. pnpm install                          # regenerate the lockfile for the new scope
  2. (cd apps/mobile && eas init)           # create your own EAS project
  3. replace infra/public_keys/deploy_key.pub with your CI deploy PUBLIC key
  4. cp infra/terraform.tfvars.example infra/terraform.tfvars   # then fill it in
  5. set CI secrets: DEPLOY_SSH_KEY, ORIGIN_CERT, ORIGIN_KEY, RENOVATE_TOKEN
  6. rm scripts/personalize.mjs   # and its "personalize" entry in package.json
`)
}

main().catch((e) => {
  console.error(e)
  exit(1)
})
