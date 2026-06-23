/**
 * Maps a Sanity document (by _type + slug) to the public routes that need
 * to be revalidated when the document is created, updated, or deleted.
 *
 * Used by /api/sanity-webhook to figure out which edge-cached pages to
 * mark stale after a publish.
 *
 * Failure mode for any type not listed here, or any path not in the map:
 *   nothing is invalidated explicitly; the page falls back to the normal
 *   ISR 300s edge-cache expiry. No incorrect content is shown.
 */

export interface IncomingDocument {
  _id?: string
  _type?: string
  slug?: { current?: string } | null
}

// Document types that have a public-facing page on the site. The webhook
// itself is configured to filter to this set in the Sanity Manage UI, but
// the handler defensively checks this whitelist too.
export const PUBLIC_DOC_TYPES = new Set<string>([
  'jobPosting',
  'news',
  'page',
  'program',
  'event',
  'alumniStory',
  'navigation',
  'siteSettings',
  'homepageConfig',
])

// Three document types are "global" — they affect chrome that appears on
// every public page (nav, footer, site name, homepage layout, structured
// data). When ANY of them changes, every page on the site is now serving
// stale content.
//
// Vercel ISR's on-demand revalidation is per-path: there is no
// "invalidate everything" API in the @astrojs/vercel adapter, and Astro
// 5 has no `revalidateTag` equivalent (that lives in Next.js only).
// So we revalidate a curated list of the highest-traffic top-level
// routes for global types. Routes not in the list (CMS-driven catch-all
// pages at `/<slug>`, dynamic detail pages we don't track here) fall
// back to the normal ISR 300s expiry — acceptable for global config
// changes, which are infrequent and rarely time-critical.
//
// If global edits start needing instant propagation everywhere, the
// right upgrade path is Vercel cache tags via `@vercel/functions`
// `addCacheTag()`, not extending this list to enumerate every URL.
const GLOBAL_DOC_TYPES = new Set<string>(['navigation', 'siteSettings', 'homepageConfig'])

const GLOBAL_PATHS: readonly string[] = [
  '/',
  '/news',
  '/calendar',
  '/careers',
  '/athletics/basketball-alumni',
]

export function pathsForDocument(doc: IncomingDocument): string[] {
  const type = doc?._type
  const slug = doc?.slug?.current

  if (!type) return []
  if (!PUBLIC_DOC_TYPES.has(type)) return []

  if (GLOBAL_DOC_TYPES.has(type)) {
    return [...GLOBAL_PATHS]
  }

  switch (type) {
    case 'jobPosting':
      return ['/careers', ...(slug ? [`/careers/${slug}`] : [])]
    case 'news':
      // Homepage carries the LatestNews block, so a news publish affects /.
      return ['/news', ...(slug ? [`/news/${slug}`] : []), '/']
    case 'page':
      return slug ? [`/${slug}`] : []
    case 'program':
      return slug ? [`/${slug}`] : []
    case 'event':
      // Homepage carries the UpcomingEvents block.
      return ['/calendar', '/']
    case 'alumniStory':
      // Only rendered on the basketball alumni page today.
      return ['/athletics/basketball-alumni']
    default:
      return []
  }
}
