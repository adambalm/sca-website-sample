import type { APIRoute } from 'astro'
import { requireCleanEnv } from '../../lib/env'
import { pathsForDocument, PUBLIC_DOC_TYPES } from '../../lib/paths-for-document'
import { revalidatePaths } from '../../lib/revalidate'
import { SIGNATURE_HEADER, verifySignature } from '../../lib/verify-sanity-signature'

// Required: Astro defaults to static output. Without this, the handler is
// stripped at build time and Vercel returns FUNCTION_INVOCATION_FAILED.
export const prerender = false

/**
 * Sanity GROQ-powered webhook -> Vercel ISR revalidation.
 *
 * Sanity fires this endpoint on document create / update / delete (and
 * NOT on draft or version events — the webhook is configured to ignore
 * those at the source, and we double-check here defensively). The
 * endpoint verifies the HMAC signature, maps the document type+slug to
 * affected public routes, and asks Vercel to mark each of those edge
 * caches stale.
 *
 * Return-code contract (aligned with Sanity's retry semantics):
 *   200  signature verified, processing complete (even if no-op)
 *   400  signature was valid but body was malformed JSON
 *   401  signature missing, malformed, stale (replay), or mismatched
 *   503  endpoint mis-configured (missing/dirty env var); retry desired
 *
 * Failure mode for any path we don't bust: the page falls back to the
 * normal ISR 300s edge-cache expiry. Visitors never see incorrect
 * content; they just see slightly-old content for at most ~5 minutes.
 *
 * Required env vars (production):
 *   SANITY_WEBHOOK_SECRET     - shared HMAC secret matching Sanity webhook
 *   VERCEL_ISR_BYPASS_TOKEN   - sent as x-prerender-revalidate header
 *   SITE_URL                  - canonical production origin (https://...)
 *                               MUST match the hostname visitors hit;
 *                               Vercel ISR caches are keyed per-host.
 *
 * Webhook config lives at:
 *   https://www.sanity.io/manage/project/wesg5rw8/api/webhooks
 *
 * Manual test:
 *   node scripts/test-sanity-webhook.mjs --type=jobPosting --slug=test
 */

interface SanityDocument {
  _id?: string
  _type?: string
  slug?: { current?: string } | null
}

function isDraftOrVersion(id?: string): boolean {
  if (!id) return false
  return id.startsWith('drafts.') || id.startsWith('versions.')
}

export const POST: APIRoute = async ({ request }) => {
  // Env vars first. Bad values here are config bugs, not request bugs,
  // so we return 503 (Sanity will retry while the operator fixes it).
  let secret: string
  let bypassToken: string
  let siteUrl: string
  try {
    secret = requireCleanEnv('SANITY_WEBHOOK_SECRET', import.meta.env.SANITY_WEBHOOK_SECRET)
    bypassToken = requireCleanEnv('VERCEL_ISR_BYPASS_TOKEN', import.meta.env.VERCEL_ISR_BYPASS_TOKEN)
    siteUrl = requireCleanEnv('SITE_URL', import.meta.env.SITE_URL)
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'env validation failed' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const rawBody = await request.text()
  const sigHeader = request.headers.get(SIGNATURE_HEADER)

  const sigResult = verifySignature(rawBody, sigHeader, secret)
  if (!sigResult.valid) {
    return new Response(
      JSON.stringify({ error: 'Invalid signature', reason: sigResult.reason }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  let doc: SanityDocument
  try {
    doc = JSON.parse(rawBody) as SanityDocument
  } catch {
    // Bad JSON from a signed-but-malformed request: tell Sanity it's
    // undeliverable so it doesn't retry. Should never happen in practice.
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const operation = request.headers.get('sanity-operation') || 'unknown'
  const documentId = request.headers.get('sanity-document-id') || doc._id || ''
  const idempotencyKey = request.headers.get('idempotency-key') || ''
  const slugCurrent = doc.slug?.current ?? null
  const targetHost = (() => {
    try {
      return new URL(siteUrl).host
    } catch {
      return siteUrl
    }
  })()

  // Defense-in-depth: the Sanity webhook config is what really gates
  // drafts/versions, but if a misconfiguration lets one through, we
  // refuse to revalidate based on draft data. Return 200 so Sanity
  // does not retry — there is nothing for it to retry into.
  if (isDraftOrVersion(documentId) || isDraftOrVersion(doc._id)) {
    return new Response(
      JSON.stringify({ ok: true, skipped: 'draft-or-version', documentId }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (!doc._type || !PUBLIC_DOC_TYPES.has(doc._type)) {
    return new Response(
      JSON.stringify({ ok: true, skipped: 'non-public-type', type: doc._type }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const paths = pathsForDocument(doc)
  if (paths.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, skipped: 'no-paths', type: doc._type }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Wait for Sanity's content lake CDN to propagate the publish before
  // asking Vercel to revalidate. The Astro client is configured with
  // useCdn:true, which can serve stale data for ~1 second after a
  // mutation. If we revalidate inside that window, Vercel re-renders
  // using stale data and caches the stale render for the full ISR
  // expiry (300s) — making it look as if the bypass did nothing.
  // Next.js's next-sanity exposes this same delay as
  // `waitForContentLakeEvent`. 2 seconds is comfortably above the
  // observed propagation time and well under Vercel's 30s function
  // timeout.
  await new Promise((resolve) => setTimeout(resolve, 2000))

  const results = await revalidatePaths({ paths, baseUrl: siteUrl, bypassToken })

  // Log for Vercel function logs. The fields below are the ones we'd
  // actually want when debugging "why did this revalidation not work?":
  //   - operation: which Sanity action (create/update/delete)
  //   - documentId: which Sanity doc fired this
  //   - idempotencyKey: lets us correlate duplicate deliveries
  //   - signatureAgeMs: confirms the signature was fresh (negative = future)
  //   - paths: what we tried to revalidate
  //   - targetHost: confirms we hit the right edge-cache namespace
  //   - results: per-path HTTP status + x-vercel-cache (REVALIDATED = good)
  console.log(
    JSON.stringify({
      event: 'sanity-webhook',
      operation,
      documentId,
      _id: doc._id,
      _type: doc._type,
      slug: slugCurrent,
      idempotencyKey,
      signatureAgeMs: sigResult.ageMs,
      targetHost,
      paths,
      results,
    })
  )

  return new Response(
    JSON.stringify({ ok: true, type: doc._type, paths, results }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}
