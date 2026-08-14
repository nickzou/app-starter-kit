import { useTRPC } from "@app-starter-kit/api-client"
import { usePowerSync, useQuery as usePowerSyncQuery } from "@powersync/react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { type FormEvent, useEffect, useState } from "react"
import { signOut, useSession } from "#/lib/auth-client"
import { PowerSyncProvider } from "#/lib/powersync/provider"

export const Route = createFileRoute("/")({ component: Home })

function AuthBar() {
  const { data: session, isPending } = useSession()

  return (
    <div className="mb-8 flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm">
      {isPending ? (
        <span className="text-neutral-500">…</span>
      ) : session ? (
        <>
          <span className="text-neutral-400">
            Signed in as <span className="text-neutral-100">{session.user.email}</span>
          </span>
          <button
            type="button"
            onClick={() => signOut()}
            className="rounded-md border border-neutral-700 px-3 py-1 text-neutral-300 transition hover:border-neutral-500 hover:text-neutral-100"
          >
            Sign out
          </button>
        </>
      ) : (
        <>
          <span className="text-neutral-400">You're not signed in.</span>
          <span className="flex gap-3">
            <Link to="/sign-in" className="text-sky-400 hover:underline">
              Sign in
            </Link>
            <Link to="/sign-up" className="text-sky-400 hover:underline">
              Sign up
            </Link>
          </span>
        </>
      )}
    </div>
  )
}

// Live calls against the tRPC API — proves the client/server + auth context are
// wired up. `ping` is public; `whoami` is protected (401 until you sign in).
function ApiDemo() {
  const trpc = useTRPC()
  const ping = useQuery(trpc.example.ping.queryOptions())
  const whoami = useQuery(trpc.example.whoami.queryOptions(undefined, { retry: false }))

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
        tRPC — live from the API
      </h2>
      <ul className="space-y-2">
        <li className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3">
          <span className="font-mono text-sm text-neutral-300">example.ping</span>
          <span className="text-sm text-neutral-400">
            {ping.isPending
              ? "…"
              : ping.isError
                ? `error: ${ping.error.message}`
                : `ok · ${ping.data.at}`}
          </span>
        </li>
        <li className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3">
          <span className="font-mono text-sm text-neutral-300">example.whoami</span>
          <span className="text-sm text-neutral-400">
            {whoami.isPending
              ? "…"
              : whoami.isError
                ? "sign in to see your user id"
                : whoami.data.userId}
          </span>
        </li>
      </ul>
    </section>
  )
}

// Renders the local database only in the browser, for a signed-in user.
// @powersync/web (wa-sqlite) can't run during SSR, and there's nothing to sync
// until we can mint a token — so gate on both `mounted` and `session` before
// mounting the provider, which owns the DB lifecycle.
function Notes() {
  const { data: session, isPending } = useSession()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (isPending || !mounted) return null
  if (!session) {
    return (
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
          Notes — offline-first
        </h2>
        <p className="text-sm text-neutral-400">
          <Link to="/sign-in" className="text-sky-400 hover:underline">
            Sign in
          </Link>{" "}
          to see your notes — they sync offline via PowerSync.
        </p>
      </section>
    )
  }

  return (
    <PowerSyncProvider>
      <NoteList />
    </PowerSyncProvider>
  )
}

// Reads and writes go straight to local SQLite. usePowerSyncQuery is live — it
// re-runs whenever the notes table changes, whether from a local write or a row
// synced down from the server — so there's no cache to invalidate and no
// optimistic bookkeeping. PowerSync uploads the local writes to the API in the
// background.
type NoteRow = { id: string; title: string; body: string }

function NoteList() {
  const db = usePowerSync()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const { data: notes, isLoading } = usePowerSyncQuery<NoteRow>(
    "SELECT id, title, body FROM notes ORDER BY created_at DESC",
  )

  async function add(event: FormEvent) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    const now = new Date().toISOString()
    await db.execute(
      "INSERT INTO notes (id, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      [crypto.randomUUID(), trimmed, body.trim(), now, now],
    )
    setTitle("")
    setBody("")
  }

  const rename = (note: NoteRow) => {
    const next = window.prompt("Edit title", note.title)
    if (next === null) return
    return db.execute("UPDATE notes SET title = ?, updated_at = ? WHERE id = ?", [
      next.trim(),
      new Date().toISOString(),
      note.id,
    ])
  }

  const remove = (id: string) => db.execute("DELETE FROM notes WHERE id = ?", [id])

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
        Notes — offline-first
      </h2>

      <form onSubmit={add} className="mb-4 space-y-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Note title…"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-sky-500"
        />
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Body (optional)…"
          rows={2}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-sky-500"
        />
        <button
          type="submit"
          disabled={!title.trim()}
          className="rounded-lg bg-sky-500 px-4 py-2 font-medium text-neutral-950 transition hover:bg-sky-400 disabled:opacity-50"
        >
          Add note
        </button>
      </form>

      {isLoading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-neutral-500">No notes yet — add your first above.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li
              key={note.id}
              className="flex items-start gap-3 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3"
            >
              <div className="flex-1">
                <p className="font-medium text-neutral-100">{note.title}</p>
                {note.body ? <p className="mt-1 text-sm text-neutral-400">{note.body}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => rename(note)}
                aria-label="Edit note"
                className="text-neutral-500 transition hover:text-sky-400"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => remove(note.id)}
                aria-label="Delete note"
                className="text-neutral-600 transition hover:text-red-400"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <AuthBar />
        <header className="mb-10">
          <h1 className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-5xl font-bold tracking-tight text-transparent">
            App Starter Kit
          </h1>
          <p className="mt-2 italic text-neutral-400">web · desktop · mobile — one stack</p>
          <p className="mt-4 text-xs uppercase tracking-widest text-neutral-500">
            tRPC · TanStack Query · Better Auth
          </p>
        </header>

        <ApiDemo />

        <Notes />

        <footer className="mt-12 text-xs leading-relaxed text-neutral-600">
          Wired to a real tRPC backend via{" "}
          <span className="font-mono">@app-starter-kit/api-client</span>. Swap the{" "}
          <span className="font-mono">example</span> router for your own to start building.
        </footer>
      </div>
    </main>
  )
}
