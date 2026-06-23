/**
 * Strict env-var reader.
 *
 * Callers pass the value already read from `import.meta.env.X` (so Vite
 * can statically resolve each access) along with the canonical NAME.
 * The helper throws if the value is undefined, empty, or has any
 * leading/trailing whitespace.
 *
 * The whitespace check exists because Vercel's env-var UI has been
 * observed to accept pasted values with trailing newlines, which then
 * silently break HMAC and bypass-token comparisons at runtime.
 */
export function requireCleanEnv(name: string, value: string | undefined): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Required env var ${name} is missing or empty`)
  }
  if (value !== value.trim()) {
    throw new Error(`Env var ${name} has leading or trailing whitespace`)
  }
  return value
}
