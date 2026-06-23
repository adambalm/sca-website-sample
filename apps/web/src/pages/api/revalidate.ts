import type { APIRoute } from 'astro'
import { requireCleanEnv } from '../../lib/env'
import { revalidatePaths } from '../../lib/revalidate'

// Required: Astro defaults to static output. Without this, the handler is
// stripped at build time and Vercel returns FUNCTION_INVOCATION_FAILED.
export const prerender = false

/**
 * Admin on-demand ISR cache revalidation endpoint.
 *
 * Use this when you need to bust the Vercel edge cache for a specific
 * list of paths immediately — for example, after a manual Sanity edit
 * if the automatic /api/sanity-webhook is not wired up yet, or to bust
 * a path the webhook's path map does not cover.
 *
 * Sanity-publish-driven revalidation lives at /api/sanity-webhook.
 *
 *   curl -X POST https://www.springfieldcommonwealthacademy.org/api/revalidate \
 *     -H "x-revalidate-token: $VERCEL_ISR_BYPASS_TOKEN" \
 *     -H "Content-Type: application/json" \
 *     --data '{"paths": ["/news", "/news/my-article", "/"]}'
 */

export const POST: APIRoute = async ({ request }) => {
  let bypassToken: string
  let siteUrl: string
  try {
    bypassToken = requireCleanEnv('VERCEL_ISR_BYPASS_TOKEN', import.meta.env.VERCEL_ISR_BYPASS_TOKEN)
    siteUrl = requireCleanEnv('SITE_URL', import.meta.env.SITE_URL)
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'env validation failed' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const token = request.headers.get('x-revalidate-token')
  if (token !== bypassToken) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let paths: string[]
  try {
    const body = await request.json()
    paths = Array.isArray(body.paths) ? body.paths : [body.path || '/']
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const results = await revalidatePaths({ paths, baseUrl: siteUrl, bypassToken })

  return new Response(
    JSON.stringify({ revalidated: results }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}
