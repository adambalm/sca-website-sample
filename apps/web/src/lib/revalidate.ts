/**
 * Shared on-demand ISR cache revalidation helper.
 *
 * Used by /api/revalidate (admin manual bust) and /api/sanity-webhook
 * (automatic bust on Sanity publish). Both endpoints hand off a list of
 * paths; this helper sends Vercel's `x-prerender-revalidate` HEAD
 * request for each one and reports back what Vercel did.
 *
 * Each path is independent: a failure on one does not stop the others.
 * Caller decides what to do with the per-path status codes returned.
 *
 * IMPORTANT: callers must pass the production canonical URL as baseUrl.
 * Vercel's ISR cache is keyed per (host + path + scheme + deployment),
 * so a HEAD against the auto-generated deployment URL does NOT bust the
 * cache that visitors on the production alias hit. SITE_URL env var is
 * the explicit source for this.
 */

export interface RevalidateResult {
  path: string
  status: number
  /**
   * Value of `x-vercel-cache` on the HEAD response. Meaningful values:
   *   - `REVALIDATED`: bypass succeeded; this path's cache is now stale
   *   - `HIT`: bypass was ignored (token mismatch, or path not in ISR)
   *   - `MISS`: cache was already empty
   *   - `STALE`: serving stale while revalidating
   * Missing if the request errored before a response.
   */
  vercelCache?: string
  error?: string
}

export interface RevalidateOptions {
  paths: string[]
  baseUrl: string
  bypassToken: string
}

export async function revalidatePaths(opts: RevalidateOptions): Promise<RevalidateResult[]> {
  const { paths, baseUrl, bypassToken } = opts
  const unique = Array.from(new Set(paths.filter(Boolean)))
  const results: RevalidateResult[] = []

  for (const p of unique) {
    const url = `${baseUrl}${p}`
    try {
      const res = await fetch(url, {
        method: 'HEAD',
        headers: { 'x-prerender-revalidate': bypassToken },
      })
      results.push({
        path: p,
        status: res.status,
        vercelCache: res.headers.get('x-vercel-cache') ?? undefined,
      })
    } catch (err) {
      results.push({
        path: p,
        status: 0,
        error: err instanceof Error ? err.message : 'unknown',
      })
    }
  }

  return results
}
