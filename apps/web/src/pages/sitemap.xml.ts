/**
 * Dynamic SSR sitemap — queries Sanity for all published content
 * and generates a complete sitemap.xml on each request.
 */
import type { APIRoute } from 'astro'
import { sanityClient } from 'sanity:client'

// Static routes that always exist
const STATIC_ROUTES = [
  '/',
  '/about',
  '/academics',
  '/athletics',
  '/admissions',
  '/student-life',
  '/contact',
  '/about/history',
  '/about/vision',
  '/about/guardian-alliance',
  '/engagement',
  '/academics/signature',
  '/academics/special',
  '/academics/future-study',
  '/athletics/philosophy',
  '/athletics/ncaa-pathway',
  '/news',
]

export const GET: APIRoute = async () => {
  const site = process.env.SITE_URL || 'https://www.springfieldcommonwealthacademy.org'

  // studentProject routes are intentionally 404'd per ADR-019 — do not advertise.
  const newsArticles = await sanityClient.fetch<{ slug: string; date: string }[]>(
    `*[_type == "news" && defined(slug.current)] | order(date desc) { "slug": slug.current, "date": date }`
  )

  const urls = [
    // Static routes — high priority
    ...STATIC_ROUTES.map(path => ({
      loc: `${site}${path}`,
      priority: path === '/' ? '1.0' : '0.8',
      changefreq: path === '/' ? 'weekly' : 'monthly',
    })),
    // News articles
    ...newsArticles.map(a => ({
      loc: `${site}/news/${a.slug}`,
      lastmod: a.date,
      priority: '0.6',
      changefreq: 'yearly' as const,
    })),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  })
}
