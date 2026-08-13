import { useTRPC } from "@app-starter-kit/api-client"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { signOut, useSession } from "#/lib/auth-client"

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

        <footer className="mt-12 text-xs leading-relaxed text-neutral-600">
          Wired to a real tRPC backend via{" "}
          <span className="font-mono">@app-starter-kit/api-client</span>. Swap the{" "}
          <span className="font-mono">example</span> router for your own to start building.
        </footer>
      </div>
    </main>
  )
}
