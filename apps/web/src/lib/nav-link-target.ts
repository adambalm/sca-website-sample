/**
 * Determines target/rel attributes for navigation links based on href shape.
 *
 *   - Relative internal links (start with "/") → same tab.
 *   - Same-site absolute https://springfieldcommonwealthacademy.org/... or
 *     https://scacademy.ai/... → same tab.
 *   - External http(s) → new tab with rel="noopener noreferrer".
 *   - PDF or Sanity-CDN-file links → new tab even when same-site (downloads/
 *     viewers should not replace the navigated page).
 *   - mailto: / tel: → no target attribute (let the OS handler open).
 *
 * The SITE_HOSTS list mirrors the production domains tracked by
 * scripts/probe-platform-state.mjs. If a domain is added or removed,
 * update both.
 */

const SITE_HOSTS = new Set<string>([
  'www.springfieldcommonwealthacademy.org',
  'springfieldcommonwealthacademy.org',
  'www.scacademy.ai',
  'scacademy.ai',
])

function hostOf(href: string): string | null {
  try {
    return new URL(href).host.toLowerCase()
  } catch {
    return null
  }
}

export function isExternalHref(href: string | null | undefined): boolean {
  if (!href) return false
  if (!/^https?:\/\//i.test(href)) return false
  const host = hostOf(href)
  if (!host) return false
  return !SITE_HOSTS.has(host)
}

export function isDocumentHref(href: string | null | undefined): boolean {
  if (!href) return false
  if (/\.pdf(\?|#|$)/i.test(href)) return true
  if (/^https?:\/\/cdn\.sanity\.io\/files\//i.test(href)) return true
  return false
}

export function getNavLinkTargetAttrs(
  href: string | null | undefined
): { target?: string; rel?: string } {
  if (!href) return {}
  if (/^(mailto:|tel:)/i.test(href)) return {}
  if (isDocumentHref(href) || isExternalHref(href)) {
    return { target: '_blank', rel: 'noopener noreferrer' }
  }
  return {}
}
