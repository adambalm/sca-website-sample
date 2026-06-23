<!--
AGENT-FACING — humans can skip this file.
Human readers: see README.md for the project overview and STATUS.md for current state.
This file documents protocol for AI agents (Claude Code, Codex, Antigravity) working in this repo.
-->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> ## Essential Context Files
>
> Before starting work, read these files to understand the project's current state:
>
> - `README.md` — **READ FIRST** — project overview, stack, local setup, routing, rendering, known issues
> - `STATUS.md` — current project phase and infrastructure state (updated per session)
> - `decisions.md` — Architecture Decision Records (ADRs, append-only)
> - `AGENTS.md` — Operational guardrails (GAM read-only, deploy authorization, etc.)
> - `docs/historical/architecture-analysis-single-vs-dual-project.md` — Post-launch Vercel consolidation analysis
> - `docs/historical/launch-runbook.md` — Historical DNS cutover plan; reference only

## Document Integrity

Planning documents go stale within a single session. These rules are mandatory.

1. **Short and replaceable over long and appended.** Planning docs under 200 lines. If a document grows beyond that, replace it with a clean version containing only verified content.
2. **Every planning doc must have a `Last verified` date at the top.** If the date is from a prior session, re-read and verify end-to-end before trusting, sharing, or acting on it.
3. **When facts change, replace — do not patch sections.** Updating one section while leaving others untouched creates contradictions. If changes affect more than one section, write a new document from scratch.
4. **Before sharing any document externally, read every line and confirm currency.** Do not vouch for a document you have not fully re-read.
5. **After the third edit to the same document in one session, stop and re-read the entire file.** This is when stale sections accumulate.

> ## Session Startup — Read Basic Memory Context
>
> Before doing any work in this repository:
>
> 1. **Read BOOTSTRAP:** `build_context` with `memory://BOOTSTRAP` for governing protocols
> 2. **Check git sync:** Verify Basic Memory is synced across machines
> 3. **Load project handoff:** `build_context` with `memory://continuity/cross-instance/sca-website-context`
> 4. **Check project board:** https://github.com/users/adambalm/projects/1
>
> If last sync was >12 hours ago, ask: "Would you like me to summarize where we left off?"
>
> ### Platform State Verification
>
> A PreToolUse hook gates memory writes behind platform state verification. If blocked, run `/verify-platform-state` (or `npm run probe:platform && npm run check:stale`). After Vercel dashboard changes, deploys, DNS modifications, or plan upgrades, run `/verify-platform-state` to refresh the state file and catch stale claims.

## Deployment

**Production is live.** Site launched, DNS cutover complete, SSR on all Sanity-connected routes.

> **For current platform state** (domains, plan tier, billing, env vars, deployment topology): read `platform-state.yml` at project root. If the file is missing or stale, run `/verify-platform-state` to regenerate it from live Vercel/DNS queries. Do NOT hardcode platform facts in documentation — they change. The YAML is the single source of truth.

**Immutable facts** (these don't change with platform state):
- **Git author:** Must be `Ed O'Connell <espoconnell@gmail.com>` — Vercel blocks deploys from unrecognized authors.
- **Framework:** Astro 5.0 with `@astrojs/vercel` adapter (NOT Next.js).
- **Vercel Root Directory:** `apps/web` (set in Vercel dashboard for `sca-website` project).
- **Studio:** `https://your-project.sanity.studio/`

### Deploy + Preview Workflow
```bash
# Deploy to production (automatic on push):
git push origin master

# Sync preview branch so Presentation tool shows latest code:
git push origin master:preview
```
**Always run both commands.** The `preview` branch is the stable URL that Sanity Studio's Presentation tool loads for visual editing. If you push to master without syncing preview, editors see stale content in the Presentation tool.

### Adapter Selection
- **Changed from:** `@astrojs/node` (standalone mode)
- **Changed to:** `@astrojs/vercel`
- **Rationale:** Node adapter incompatible with Vercel serverless; Vercel adapter provides native integration

### Runtime Tests Verified
| Test | Result |
|------|--------|
| `/projects` page loads | PASS |
| All 4 student projects render | PASS |
| SSR detail routes (`/projects/[id]`) | PASS |
| Google Drive links present | PASS |
| Sanity data fetch (live) | PASS |

### Sanity Presentation Tool (Visual Editing)

The Presentation tool is configured in `apps/sca-studio/sanity.config.ts` with document-to-URL mapping (`resolve` config). It maps `news`, `studentProject`, `page`, and `program` documents to their frontend routes.

**Environment portability:** Preview URL is set via `SANITY_STUDIO_PREVIEW_URL` env var in `apps/sca-studio/.env.production`, falling back to `http://localhost:4321`. Currently points to the `preview` branch deployment: `https://sca-website-git-preview-ed-oconnells-projects.vercel.app`. Change the value and run `sanity deploy` to update.

**Frontend side:** `@sanity/visual-editing` is installed in `apps/web` and mounted via `SanityVisualEditing.tsx` in `BaseLayout.astro`. Stega encoding is enabled in `astro.config.mjs`.

### Known Warnings
- **TypeScript check:** `astro check` may fail on strict mode; build script split to `build` (astro build) and `typecheck` (astro check) to prevent blocking deployment
- **Chunk size warning:** `SanityVisualEditing.js` exceeds 500KB; non-blocking, optimization deferred

### Safety Guardrails for Future Agents
1. **GAM is READ-ONLY** unless operator explicitly authorizes write operations
2. **Evidence-before-assertion:** Never claim runtime success without verification
3. **Human escalation:** Request operator screenshot for UI verification when ambiguous
4. **No credential modification:** Never rotate tokens, change scopes, or regenerate OAuth

---

## Project Overview

This is a monorepo for a school website (SCA - likely a boarding/educational institution) using:
- **Astro 5.0** - Static site generator frontend
- **Sanity Studio** - Headless CMS for content management
- **npm workspaces** - Monorepo management

## Commands

### Development
```bash
npm run dev:studio    # Start Sanity Studio at localhost:3333
npm run dev:web       # Start Astro dev server at localhost:4321
```

### Build
```bash
npm run build:web     # Type-check and build Astro site
```

### Workspace-specific (run from root)
```bash
npm run dev --workspace=apps/sca-studio
npm run dev --workspace=apps/web
npm run build --workspace=apps/sca-studio   # Build Sanity Studio
```

### Direct Sanity commands (from apps/sca-studio)
```bash
sanity deploy           # Deploy studio
sanity graphql deploy   # Deploy GraphQL API
```

## Architecture

```
apps/
├── sca-studio/              # Sanity CMS
│   └── schemaTypes/
│       ├── documents/       # 15 content types (page, news, person, event, studentProject, etc.)
│       ├── blocks/          # 11 section builder blocks (heroSection, cardGrid, ctaBanner, latestNews, videoEmbed, etc.)
│       └── objects/         # Reusable objects (seo, socialLink, announcement)
└── web/                     # Astro frontend
    └── src/
        ├── pages/           # Routes (home, news, projects, admin/*, [...slug] catch-all)
        ├── components/sections/  # 11 Astro section components + SectionRenderer
        ├── sanity/lib/      # load-query.ts (perspective + stega control)
        └── styles/          # global.css + theme variants
```

### Content Model

Key document types in Sanity:
- **page** - Hierarchical pages with parent/child relationships + section-based page builder
- **news** - Articles with source tracking (manual/instagram/external), file attachments
- **person**, **department**, **program** - Staff and academic structure
- **event**, **mediaGallery**, **alumniStory** - Events and media content
- **boardingFeature**, **admissionsPath** - School-specific content
- **navigation** - CMS-driven nav menus (main + footer)
- **homepageConfig** - Homepage hero image and feature configuration
- **scaoBriefingRecord** - SCAO operations document
- **siteSettings** - Global configuration (singleton)

All content types include an `seo` object for meta title, description, and social images.

### Section Builder (Page Builder)

11 block types available in page `sections` array (also on `homepageConfig.sections[]` when `useSections` is ON, see ADR-026, and on `program.sections[]`):
`heroSection`, `richText`, `cardGrid`, `textWithImage`, `ctaBanner`, `statsRow`, `testimonialBlock`, `accordionSection`, `upcomingEvents`, `latestNews`, `videoEmbed`

`videoEmbed` (added 2026-05-06, ADR-027) renders YouTube/Vimeo URLs as a privacy-mode iframe (`youtube-nocookie.com` / `player.vimeo.com`, `loading="lazy"`, `referrerpolicy="strict-origin-when-cross-origin"`). URL parsing is shared between schema validation (`apps/sca-studio/lib/video-embed.ts`) and the renderer (`apps/web/src/lib/video-embed.ts`) and uses an explicit host allowlist. `latestNews` is omitted from `program.sections[]` (feed block); `videoEmbed` is registered on all three section-bearing document types.

Rendered by `SectionRenderer.astro` → dispatches to individual `sections/*.astro` components.

### Frontend-CMS Integration

Astro fetches content via `loadQuery` wrapper (`apps/web/src/sanity/lib/load-query.ts`):
```typescript
import { loadQuery } from '../sanity/lib/load-query'
const { data } = await loadQuery(`*[_type == "news"]`)
```

**`loadQuery` controls perspective + stega** based on `PUBLIC_SANITY_VISUAL_EDITING_ENABLED`:
- **Production:** `published` perspective, no stega encoding
- **Staging:** `previewDrafts` perspective, stega encoding for visual editing overlays

**Navigation is CMS-driven** — main and footer nav documents in Sanity, rendered by `BaseLayout.astro`.

### Environment Variable Conventions

| Prefix | Scope | Example |
|--------|-------|--------|
| `PUBLIC_SANITY_*` | Client-side (Vite/Astro) | `PUBLIC_SANITY_VISUAL_EDITING_ENABLED` |
| `SANITY_API_*` | Server-only credentials | `SANITY_API_READ_TOKEN` |
| `SANITY_STUDIO_*` | Baked into Studio at deploy | `SANITY_STUDIO_PREVIEW_URL` |

**Single env file:** Root `.env.local` only. `astro.config.mjs` sets `vite: { envDir: '../../' }`.

## Configuration

- **Sanity Project ID**: `wesg5rw8`
- **Dataset**: `production`
- **API Version**: `2024-01-01`

### Code Style (sca-studio)
- No semicolons
- Single quotes
- No bracket spacing
- 100 char print width

## Migration Scripts

Scripts for Webflow → Sanity content migration:

```bash
# Site inventory (discover URLs)
node scripts/webflow-inventory.js

# Content extraction (Playwright-based)
node scripts/extract-all-content.mjs --all           # Full extraction
node scripts/extract-all-content.mjs --info-pages    # Just info pages
node scripts/extract-all-content.mjs --programs      # Just programs
node scripts/extract-all-content.mjs --dry-run       # Preview mode

# News import to Sanity
node scripts/import-news-to-sanity.mjs --dry-run     # Validate
node scripts/import-news-to-sanity.mjs --images-only # Upload images
node scripts/import-news-to-sanity.mjs --create      # Create documents
```

**Extracted data** (gitignored, not in this snapshot): `data/webflow-extract/` held the Portable Text pages, program JSON, and downloaded images plus their Sanity asset-ID mappings.
