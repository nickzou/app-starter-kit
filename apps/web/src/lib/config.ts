// Runtime configuration for the web app — currently just the API URL.
//
// Resolved at runtime rather than inlined by Vite at build time, so one built
// image can serve multiple environments: a deployed SSR server reads the URL
// from its container env and injects it as window.__APP_CONFIG__. Until that's
// wired up (deploy), this simply falls back to the build-time VITE_API_URL (or
// localhost), matching the app's prior behavior.
//
// Resolution order:
//   - SSR (server): process.env.API_URL — the container's runtime env
//   - browser, injected: window.__APP_CONFIG__ (set by the SSR shell, if present)
//   - browser / desktop SPA, no injection: build-time VITE_API_URL, else localhost

export type AppConfig = {
  apiUrl: string
}

declare global {
  interface Window {
    __APP_CONFIG__?: AppConfig
  }
}

const DEFAULT_API_URL = "http://localhost:3001"

// Bracketed access so Vite doesn't statically replace it in the client bundle;
// `process` is undefined in the browser, so guard on it first.
function serverEnv(name: string): string | undefined {
  return typeof process !== "undefined" ? process.env[name] : undefined
}

// Build-time value (inlined by Vite). The desktop/mobile SPA fallback.
function buildTimeConfig(): AppConfig {
  return {
    apiUrl: import.meta.env.VITE_API_URL ?? DEFAULT_API_URL,
  }
}

export function getConfig(): AppConfig {
  // Server-side render: the container's runtime env wins, else build-time.
  if (typeof window === "undefined") {
    return { apiUrl: serverEnv("API_URL") ?? buildTimeConfig().apiUrl }
  }
  // Browser: the SSR-injected config if present, else build-time (desktop SPA).
  return window.__APP_CONFIG__ ?? buildTimeConfig()
}
