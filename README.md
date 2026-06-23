# SCA Website

Website for **Springfield Commonwealth Academy**. Astro frontend + Sanity CMS + Vercel hosting. Content is editor-driven; code is developer-driven.

**Live:** <https://www.springfieldcommonwealthacademy.org>

> This is a public work-sample snapshot of an institutional website + CMS I build and operate. Internal operational docs, Google Workspace tooling, and runtime state have been removed; the application code, content model, tests, and architecture-decision record are intact.

---

## Stack

- **Astro 5** — SSR frontend with the `@astrojs/vercel` adapter
- **Sanity Studio** — headless CMS, project `wesg5rw8`, dataset `production`
- **Vercel** — Git-backed auto-deploy on push to `master`, ISR edge caching
- **Playwright** + **axe-core** — functional, accessibility, visual-regression, responsive, and SSR-verification tests
- **npm workspaces** — monorepo with `apps/web` (frontend) and `apps/sca-studio` (CMS)

---

## Run it locally

```bash
git clone <repo>
cd sca-website
npm install

# Populate env — required. .env.local is gitignored.
cp .env.example .env.local
# Fill in SANITY_API_READ_TOKEN and SANITY_API_WRITE_TOKEN
# (Sanity → Manage → project wesg5rw8 → API → Tokens)

npm run dev:web       # Astro → http://localhost:4321
npm run dev:studio    # Studio → http://localhost:3333  (in a separate shell)
```

**Port note:** the Astro dev server uses 4321 and Studio uses 3333. Other local Astro / Sanity projects will conflict.

---

## Repo layout

```
sca-website/
├── apps/
│   ├── web/                           # Astro frontend
│   │   ├── src/
│   │   │   ├── pages/                 # Routes (see below)
│   │   │   ├── layouts/BaseLayout.astro
│   │   │   ├── components/
│   │   │   │   ├── NewsCard.astro, PageHero.astro, PortableText.astro
│   │   │   │   └── sections/          # 11 page-builder block components
│   │   │   ├── sanity/lib/            # load-query.ts (perspective + stega)
│   │   │   └── styles/                # global.css + theme variants
│   │   ├── astro.config.mjs           # ISR 300s, Sanity integration, env dir ../../
│   │   └── vercel.json                # Webflow-era redirects
│   └── sca-studio/                    # Sanity Studio
│       ├── sanity.config.ts           # Desk structure, presentation tool, allowOrigins
│       └── schemaTypes/               # 16 documents, 11 blocks, 3 objects
├── tests/                             # Playwright + axe specs
├── scripts/                           # Content-migration + audit utilities
├── docs/
│   ├── editor/                        # Editor recipes — start here for CMS work
│   └── image-spec.md                  # Image sizing + hotspot conventions
├── .env.example                       # Env var template
├── decisions.md                       # ADR log — read before major changes
├── STATUS.md                          # Current state snapshot
├── DESIGN.md / design-tokens.json     # Design system
└── CLAUDE.md, AGENTS.md               # Agent-development protocol (humans can skip)
```

---

## Content model

15 multi-instance document types, 11 block types, 3 reusable objects (exact list in `apps/sca-studio/schemaTypes/index.ts`).

**Singletons** (pinned in Studio under **Settings**):

- `siteSettings` — school name, tagline, address, phone, email, social links, announcement banner, default SEO
- `homepageConfig` — homepage hero, stats, value props, program highlights, CTA. Exposes a `useSections` toggle (default OFF) and a `sections[]` page-builder array; when ON, the homepage delegates to `SectionRenderer`.

**Navigation** (keyed by `identifier`): `navigation identifier=="main"` (header) and `=="footer"`.

**Content documents:** `page`, `program`, `news`, `event`, `person`, `department`, `alumniStory`, `studentProject`, `mediaGallery`, `boardingFeature`, `admissionsPath`, `jobPosting`.

**Blocks** (embedded in `page.sections[]`, `program.sections[]`, `homepageConfig.sections[]`): `heroSection`, `textWithImage`, `cardGrid`, `ctaBanner`, `richText`, `statsRow`, `testimonialBlock`, `accordionSection`, `upcomingEvents`, `latestNews`, `videoEmbed`. `latestNews` is omitted from `program.sections[]`.

**Objects:** `seo`, `socialLink`, `announcement`.

Schema validation enforces URL formats on nav items, warns on missing image alt text, locks reserved slugs (`home`, `demos`, `contact`), and conditionally requires fields by render mode — so editors can't create broken content states.

---

## Routing

Every public content page flows through `apps/web/src/pages/[...slug].astro`, which resolves in two passes:

1. **`ROUTE_MAP`** — explicit URL-path → Sanity-slug mappings for cases where the URL differs from the slug or custom breadcrumbs are needed (e.g. `/about/history`, `/academics/signature`, `/athletics/basketball`).
2. **Dynamic fallback** — any path not in `ROUTE_MAP` is matched against `*[(_type == "page" || _type == "program") && slug.current == $slug][0]`, so a new Sanity `page` with slug `foo` auto-resolves at `/foo` with no code change.

**Special routes** (outside the catch-all):

- `/` → `index.astro` (reads `homepageConfig`)
- `/news`, `/news/:slug` → dedicated pages
- `/projects`, `/projects/:id` → **404 intentionally** (ADR-019; student work is out of launch scope)
- `/calendar`, `/athletics/basketball-alumni`, `/careers` → dedicated pages
- `/admin/block-library` (page-builder block reference) and `/admin/reskinning-guide` — `noindex` internal references; URL is not access control
- `/api/sanity-webhook` (HMAC-verified ISR revalidation), `/api/revalidate`
- `/sitemap.xml`, `/robots.txt` → dynamic, SSR

**Vercel redirects** (`apps/web/vercel.json`): permanent redirects for Webflow-era URLs.

---

## Rendering

All Sanity-connected pages are SSR (`export const prerender = false`), wrapped by Vercel ISR with a 300-second edge cache. On Studio publish, an HMAC-verified webhook (`/api/sanity-webhook`) revalidates the affected paths so changes reach production in seconds rather than waiting on ISR expiry.

**Visual editing** is controlled by `PUBLIC_SANITY_VISUAL_EDITING_ENABLED`:

- `false` (production) → `published` perspective, no stega encoding
- `true` (preview branch) → `previewDrafts` perspective, stega enabled for click-to-edit overlays in Studio's Presentation tool

Wrapper: `apps/web/src/sanity/lib/load-query.ts`. Every frontend Sanity query goes through it.

---

## Deploying

- **Production:** `git push origin master` → Vercel auto-deploys the `sca-website` project
- **Preview (visual editing):** `git push origin master:preview` — keeps the `preview` branch in sync so the Presentation tool can load it
- **Studio:** `cd apps/sca-studio && npx sanity deploy`

> Always push `master` and `master:preview` together. If they diverge, Presentation-tool previews break for editors.

---

## Tests & CI

```bash
npx playwright test                                              # All specs, local base URL
BASE_URL=https://www.springfieldcommonwealthacademy.org \
  npx playwright test tests/ssr-verification.spec.ts             # Prod smoke
```

15 spec files under `tests/`: functional, accessibility (axe-core, WCAG 2.1 AA), visual-regression, visual/resolution audit, responsive, sections, SSR verification, editorial review, nav-link-target, and webhook-signature verification.

**CI** (`.github/workflows/ci.yml`) runs on push / PR to `master`: install → `build:web` → a production SSR smoke test (`tests/ssr-verification.spec.ts`). The broader accessibility / visual / responsive suites run locally; expanding CI coverage is tracked in `STATUS.md`.

---

## Content editors

Editor guides live in `docs/editor/`:

- `01-global-settings-and-nav.md` — site settings, nav, announcement banner
- `02-recipe-news-and-soccer-page.md` — creating news, featuring on the homepage, new program pages, image handling

Studio validation enforces URL formats and warns on missing alt text, so editors don't memorize rules.

---

## Architecture decisions

`decisions.md` — append-only ADR log. Read before proposing an architectural change. Key locked decisions:

- Git-backed production deploys (ADR-002 amendment)
- SSR for all content pages (ADR-007 amendment) — fixed stale/ghost content from static listing pages
- CMS-driven navigation (ADR-012)
- Section-based page builder (ADR-013)
- Student projects out of launch scope (ADR-019) — `/projects` intentionally 404s
- Move validation into Sanity schemas instead of editor docs (ADR-024)
- HMAC-verified webhook ISR revalidation (ADR-031–033)

---

## Known issues

1. **`npm run typecheck` reports `Cannot find module 'sanity:client'`.** The `sanity:client` virtual module has no static type declarations; `build:web` and production deploys are unaffected. Fix: add an `env.d.ts` entry referencing `@sanity/astro` types.
2. **`apps/web/package.json` still lists `@astrojs/node`** — unused (replaced by `@astrojs/vercel`); safe to remove.
3. **Data-loading paths use `any`** in the catch-all route, layout, and `SectionRenderer`. Functional but untyped; typing the nav/section/document shapes is the next cleanup.

`STATUS.md` tracks these plus anything else in flight.

---

## Windows-specific notes

- Pasting tokens into `.env.local` can append `\r` (CR). If auth mysteriously fails, run `sed -i 's/\r$//' .env.local` from Git Bash.

Files prefixed `CLAUDE.md` / `AGENTS.md` are agent-development protocol. Humans can skip them.
