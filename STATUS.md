# Project Status: SCA Website

**Last Updated:** 2026-05-12

**One-line state:** Live on `springfieldcommonwealthacademy.org`. Astro SSR + Sanity CMS on Vercel. HMAC-verified webhook ISR revalidation active (ADR-031/032/033): editor publish in Studio → page refreshed on production within seconds. Four schemas (mediaGallery, boardingFeature, admissionsPath, scaoBriefingRecord) remain registered with no documents, deferred to a later cleanup.

---

## Deployment

| Target | URL | Method |
|---|---|---|
| Production | `springfieldcommonwealthacademy.org` | Vercel `sca-website` project, Git-backed. Push to `master` → auto-deploy. |
| Preview | `…-git-preview-…vercel.app` | Vercel preview env. Sync with `git push origin master:preview`. |
| Studio | `your-project.sanity.studio` | `cd apps/sca-studio && npx sanity deploy` |

**Git author constraint:** commits must be authored by `Ed O'Connell <[redacted]>` or Vercel rejects the push.

---

## Rendering

All Sanity-connected pages are SSR (`export const prerender = false`), wrapped in Vercel ISR with a 300s edge cache. On Studio publish, the HMAC-verified webhook (`/api/sanity-webhook`) revalidates affected paths so changes reach production in seconds. Visual editing is gated by `PUBLIC_SANITY_VISUAL_EDITING_ENABLED` — true on the preview branch only.

---

## Content counts (verified 2026-04-20)

| Type | Count |
|---|---|
| News | 14 |
| Events | 17 |
| Pages | 13 |
| Programs | 9 (4 academic, 4 athletic, 1 NCAA pathway) |
| Student Projects | 7 (routes disabled per ADR-019) |
| Alumni Stories | 49 (rendered on `/athletics/basketball-alumni`) |
| People (faculty) | 1 |
| Navigation | 2 (main + footer) |
| Singletons | 2 (siteSettings, homepageConfig) |
| Job Postings | new doc type (ADR-031) |
| Registered, 0 docs | mediaGallery, boardingFeature, admissionsPath, scaoBriefingRecord |

---

## Live route HTTP status (verified 2026-04-21)

- **200:** `/`, `/about`, `/academics`, `/admissions`, `/student-life`, `/news`, `/calendar`, `/head-of-school`, `/athletics/basketball`, `/athletics/philosophy`, `/about/history`, `/about/vision`, `/about/guardian-alliance`, `/engagement`, `/contact`
- **404:** `/projects` (intentional per ADR-019)
- **308:** `/community` → `/about` (per `vercel.json`)

---

## Open engineering work

1. **Homepage section-builder migration** — `index.astro` keeps the legacy bespoke template, with a `useSections` flag (default OFF) on `homepageConfig` that routes to `SectionRenderer` when an editor opts in. Phase: editor populates `sections[]` and tests on preview before flipping ON; remove the legacy template once production has run on sections-mode with sign-off (ADR-026).
2. **Fix `npm run typecheck`** — fails on `Cannot find module 'sanity:client'` (virtual module, no type declaration). Build/deploy unaffected. Needs an `env.d.ts` referencing `@sanity/astro` types.
3. **Type the data-loading paths** — catch-all route, layout, and `SectionRenderer` use `any`; type the nav/section/document shapes.
4. **Remove unused `@astrojs/node`** from `apps/web/package.json`.
5. **Add `/api/health` endpoint** + uptime monitor.
6. **Expand CI** — currently build + prod SSR smoke; add typecheck and the accessibility suite once `sanity:client` typing is resolved.

---

## Key files

| File | Purpose |
|---|---|
| `README.md` | Human-facing project overview (read first) |
| `decisions.md` | ADR log, append-only |
| `STATUS.md` | This file |
| `docs/editor/` | Editor recipes |
| `apps/web/src/layouts/BaseLayout.astro` | Every page inherits this |
| `apps/web/src/pages/[...slug].astro` | Catch-all content router |
| `apps/web/src/components/sections/SectionRenderer.astro` | Block dispatcher |
| `apps/web/src/sanity/lib/load-query.ts` | Controls perspective + stega |
| `apps/web/src/pages/api/sanity-webhook.ts` | HMAC-verified ISR revalidation |
| `apps/sca-studio/schemaTypes/index.ts` | Schema registry |
| `.github/workflows/ci.yml` | CI: build + production SSR smoke |

---

## Doc freshness rule

Every commit that changes pages, schemas, config, or infrastructure must update the affected doc's Last Updated / Last Verified date. Convention, not tooling. See `AGENTS.md` Rule 7.
