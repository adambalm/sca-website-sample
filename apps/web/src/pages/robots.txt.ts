/**
 * Static robots.txt — production domain is stable, no need for
 * dynamic host detection. Vercel preview deploys are already
 * blocked by X-Robots-Tag: noindex header.
 */
import type { APIRoute } from 'astro'

export const prerender = true

export const GET: APIRoute = () => {
  const body = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /scao/

Sitemap: https://www.springfieldcommonwealthacademy.org/sitemap.xml
`

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain' },
  })
}
