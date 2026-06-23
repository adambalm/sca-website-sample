# Architecture Decision Records

Append-only log of significant decisions. Agents draft entries during sessions; human reviews before commit.

---

## ADR-001: Shared Drive model for student projects
**Date:** 2026-01-27 | **Status:** Accepted

**Context:** Students need Google Drive folders for project submissions. Options were individual student-owned folders or a school-owned Shared Drive with per-project subfolders.

**Decision:** School-owned Shared Drive with per-project folders. The folder name embeds an idempotency key: `{title} [sca-project-{id}]`.

**Consequence:** School retains ownership of all files. Student access is granted via ACLs (`fileorganizer` role). If a student leaves, files remain accessible. GAM agent provisions folders automatically.

---

## ADR-002: Vercel CLI deploy (not Git-triggered)
**Date:** 2026-01-30 | **Status:** Accepted

**Context:** Needed to get the Astro site deployed. Options were Git-triggered deploys via Vercel integration or manual CLI deploys (`vercel --prod`).

**Decision:** Manual CLI deploys from `apps/web`. No Git integration configured.

**Consequence:** Code changes require an explicit `vercel --prod` command to go live. SSR pages pull fresh Sanity content at request time, so content updates are instant without a deploy. Static pages require a rebuild.

---

## ADR-003: GAM agent on a dedicated server (not serverless)
**Date:** 2026-01-27 | **Status:** Accepted

**Context:** GAM requires a local binary with OAuth credentials and shells out via `child_process.exec`. Can't run in Vercel's serverless environment.

**Decision:** Run the GAM watch agent as a long-lived Node.js process on a dedicated Linux server, where GAM is pre-installed at a fixed local path.

**Consequence:** Operational dependency on a single server. Process supervision and monitoring required (see ADR-005).

---

## ADR-004: Crash recovery via idempotent folder naming
**Date:** 2026-01-29 | **Status:** Accepted

**Context:** If the GAM agent crashes after creating a Drive folder but before updating Sanity, a restart could create duplicate folders.

**Decision:** Folder names contain the Sanity document ID as an idempotency key. On restart, the agent queries Drive for existing folders matching the key before creating. Polling query also picks up stale "Provisioning" records (configurable timeout, default 10 min).

**Consequence:** Duplicate folders are prevented. Crash recovery is automatic on agent restart. No manual intervention needed for the most common failure mode.

---

## ADR-005: systemd for GAM agent supervision
**Date:** 2026-02-07 | **Status:** Accepted

**Context:** Agent was running as an unsupervised `bash -c 'source ~/.nvm/nvm.sh && node gam-watch-agent.js &'` process. No restart on crash or server reboot. Historical Caddy incident on this server (a port 443 collision) made us cautious — we verified this unit binds no ports and runs as an unprivileged user.

**Decision:** systemd unit `sca-gam-watch.service` with `Restart=on-failure`, `RestartSec=30`, and a hardcoded absolute node path.

**Consequence:** Agent survives reboots and crashes. Managed via `systemctl start/stop/restart/status sca-gam-watch`.

---

## ADR-006: journald logging (replacing file-based)
**Date:** 2026-02-07 | **Status:** Accepted

**Context:** Agent was appending to a local log file with no rotation. 6MB in 8 days, mostly "No pending projects found" noise. Needed either logrotate or a different approach.

**Decision:** Removed `StandardOutput`/`StandardError` file directives from systemd unit. Logging goes to journald only. Old log archived locally.

**Consequence:** Journald handles rotation automatically. Logs accessed via `journalctl -u sca-gam-watch`. No logrotate config needed. Log noise reduction (ADR pending) is still desirable.

---

## ADR-007: SSR for dynamic routes, static for landing pages
**Date:** 2026-01-30 | **Status:** Accepted

**Context:** News detail and project detail pages need fresh Sanity content. Landing pages (home, news index, projects index) can tolerate build-time content.

**Decision:** `export const prerender = false` on `/news/[slug]` and `/projects/[id]`. All other pages are statically generated at build time.

**Consequence:** SSR pages always show current content without redeploy. Static pages require `vercel --prod` to pick up new content. Homepage news cards are stale until next deploy.

---

## ADR-008: ADR process — agents draft, human reviews
**Date:** 2026-02-08 | **Status:** Accepted

**Context:** Documentation was drifting from operational reality (e.g., onboarding doc said "no supervisor" after systemd was deployed). Needed a mechanism to keep decisions documented without relying on memory.

**Decision:** Single `decisions.md` in repo root. Append-only. AI agents draft entries during working sessions. Human reviews before commit. One entry per architectural or operational decision.

**Consequence:** Decisions are captured as a side effect of working, not as a separate discipline. The file never goes stale because entries are historical records, not "current state" descriptions.

---

## ADR-009: Sanity Presentation tool with env-aware preview URL
**Date:** 2026-02-08 | **Status:** Accepted | **Agent:** Claude Code

**Context:** Sanity Studio's Presentation tool was partially installed (`@sanity/visual-editing` in frontend, `SanityVisualEditing` component mounted in BaseLayout) but had no `resolve` config, so it couldn't map documents to frontend URLs. Studio is deployed to both local dev (localhost:3333) and Sanity Cloud, so the preview URL needs to work in both environments.

**Decision:** Added `resolve` config to `presentationTool()` in `sanity.config.ts` mapping 4 document types (`news`, `studentProject`, `page`, `program`) to frontend routes. Preview URL reads from `SANITY_STUDIO_PREVIEW_URL` env var, falling back to `http://localhost:4321`. For Sanity Cloud deployment, set the env var to the Vercel production URL in manage.sanity.io.

**Consequence:** Clicking a document in Studio's Presentation tool navigates the preview iframe to the correct frontend page. Works locally out of the box; requires one env var for deployed Studio. Note: `page` and `program` resolve to `/{slug}`, which won't match all catch-all routes (e.g., `vision-mission` slug lives at `/about/vision` URL). Full slug-to-URL mapping would require duplicating the `ROUTE_MAP` from `[...slug].astro` — deferred as low priority.

---

## ADR-010: Gitignore hardening for extraction artifacts
**Date:** 2026-02-09 | **Status:** Accepted | **Agent:** Antigravity

**Context:** Sensitive data audit found that `data/` (62MB, 94 files of Webflow extraction artifacts), `recon/` (internal evidence files containing sensitive operational data), and `.claude/settings.local.json` (agent-local MCP config) were all unignored and one `git add .` away from being committed to a public GitHub repo.

**Decision:** Added `data/`, `recon/`, `.claude/settings.local.json`, and `nul` to `.gitignore`. Untracked `.claude/settings.local.json` via `git rm --cached`. Confirmed `data/` is only consumed by one-time migration scripts (not build or runtime) — Astro reads all images from Sanity CDN via `@sanity/image-url`.

**Consequence:** Extraction artifacts and recon evidence can never be accidentally staged. The `data/` folder remains on disk for potential re-runs of import scripts but won't enter version control. Migration scripts still reference `data/webflow-extract/` by path and will work if the folder exists locally.

---

## ADR-011: Plain GAM for Groups → Classroom rostering
**Date:** 2026-02-09 | **Status:** Accepted | **Agent:** Antigravity

**Context:** Needed to determine whether plain GAM 7.32.04 could handle automated rostering (read Google Group membership, write to Classroom course rosters) or whether we'd need GAMADV-XTD3, direct Classroom API scripting, or another tool.

**Decision:** Keep plain GAM. End-to-end two-command workflow verified against live Workspace: `gam print group-members group <group> fields email > members.csv` then `gam course <id> sync students csvfile members.csv:email`. The `sync` command handles add/remove/skip internally. GAM's `csvfile <path>:<column>` selector reads its own CSV export — no intermediate transformation needed.

**Consequence:** No additional tooling needed. The automation harness is a simple script wrapping two GAM commands per group-course pair. Requires: (1) a mapping table (group email → course ID), (2) a harness script with dry-run mode and diff logging, (3) AGENTS.md update to authorize automated writes. Evidence: `docs/historical/gam-capability-matrix.md` and internal GAM sync-test records.

---

## ADR-002 Amendment: Git-backed production deploys
**Date:** 2026-03-09 | **Status:** Accepted | **Amends:** ADR-002

**Context:** CLI-only deploys (ADR-002) were error-prone. The `sca-website` Vercel project was connected to the Git repo to enable automatic deploys on push to `master`.

**Decision:** Production (`sca-website`) is now Git-backed — every push to `master` triggers an automatic Vercel deploy. Staging (`web`) remains CLI-deployed for visual editing preview.

**Consequence:** ADR-002 is superseded for production. `vercel --prod` from `apps/web` still deploys the staging environment. Git author must be `Ed O'Connell <espoconnell@gmail.com>` — Vercel blocks deploys from unrecognized authors.

---

## ADR-007 Amendment: SSR expanded to all content pages
**Date:** 2026-03-16 | **Status:** Accepted | **Amends:** ADR-007 | **Agent:** Claude Code

**Context:** ADR-007 said listing pages could be static. In practice, static `/news` and `/projects` indexes caused ghost articles (deleted content persisting) and missing new content (newly published articles not appearing), while the SSR homepage showed fresh data — confusing editors.

**Decision:** Expanded SSR to all Sanity-connected pages: `/`, `/news`, `/news/[slug]`, `/projects`, `/projects/[id]`, and `[...slug]` catch-all. Only `/admin/platform-overview` remains truly static.

**Consequence:** Editors get instant publish-to-live behavior everywhere. No more "rebuild to see changes" confusion. Slightly higher Vercel function invocation count but well within plan limits.

---

## ADR-012: CMS-driven navigation
**Date:** 2026-03-13 | **Status:** Accepted | **Agent:** Claude Code

**Context:** Navigation was hardcoded in `BaseLayout.astro`. Adding or reordering nav links required a code change and redeploy. Editors had no control over site navigation.

**Decision:** Created `navigation` document type in Sanity Studio with main and footer sections. `BaseLayout.astro` fetches navigation documents at render time.

**Consequence:** Editors can modify navigation from Sanity Studio without code changes. Changes appear instantly thanks to SSR. The hardcoded nav was removed from the layout template.

---

## ADR-013: Section-based page builder
**Date:** 2026-03-05 | **Status:** Accepted | **Agent:** Claude Code

**Context:** Content pages were rendered as monolithic Portable Text blocks. Editors couldn't create visually distinct page sections (hero, card grids, CTAs, testimonials) within the CMS.

**Decision:** Added 9 block types to the `page` schema's `sections` array: `heroSection`, `richText`, `cardGrid`, `textWithImage`, `ctaBanner`, `statsRow`, `testimonialBlock`, `accordionSection`, `upcomingEvents`. Each has a corresponding Astro component under `src/components/sections/`. `SectionRenderer.astro` dispatches by `_type`.

**Consequence:** Editors can compose pages from reusable building blocks. Design consistency is enforced by component templates. Adding new section types requires both a schema type and an Astro component.

---

## ADR-014: SCAO intake form architecture
**Date:** 2026-03-05 | **Status:** Accepted | **Agent:** Claude Code

**Context:** The SCAO expansion initiative needed a structured data collection mechanism for new-school intake information. Options were a third-party form service or a native Astro + Sanity implementation.

**Decision:** Native implementation: `scaoNewSchoolIntake` Sanity schema, Astro API route at `/api/scao-intake`, and public form at `/admin/scao-intake`. Form submissions write directly to Sanity via `SANITY_API_WRITE_TOKEN`.

**Consequence:** No third-party dependencies. Data lives in Sanity alongside all other content. Write token must be available in the Vercel environment.

---

## ADR-015: Dual Vercel project topology
**Date:** 2026-03-09 | **Status:** Accepted | **Agent:** Antigravity

**Context:** Needed separate environments for production (stega-free, no visual editing) and staging (visual editing enabled, stega encoding). A single Vercel project can't serve both configurations because `PUBLIC_SANITY_VISUAL_EDITING_ENABLED` is baked into the client build.

**Decision:** Two Vercel projects: `sca-website` (production, Git-backed) and `web` (staging, CLI-deployed). Each has different env vars controlling visual editing behavior. Root `.vercel/project.json` → production; `apps/web/.vercel/project.json` → staging.

**Consequence:** Visual editing works on staging without affecting production. Studio's `allowOrigins` must include both URLs. Deferred rename to `sca-production` + `sca-staging` for clarity.

---

## ADR-016: Studio deploy monorepo workaround
**Date:** 2026-03-16 | **Status:** Accepted | **Agent:** Claude Code

**Context:** `sanity deploy` from `apps/sca-studio/` fails because npm workspaces hoists `react`, `react-dom`, and `styled-components` to the monorepo root. Sanity's Rollup config resolves dependencies relative to the studio directory, not the workspace root.

**Decision:** Workaround: manually copy the three deps from root `node_modules/` into `apps/sca-studio/node_modules/` before deploying, then clean up after. Verified with sanity 5.16.0, react 19.2.4. `useMemoCache` TypeError warnings during build are non-blocking.

**Consequence:** Studio deploys require this manual step. A permanent fix would require Sanity to support monorepo resolution or switching to a non-hoisting package manager.

---

## ADR-017: Environment variable naming conventions
**Date:** 2026-03-16 | **Status:** Accepted | **Agent:** Claude Code

**Context:** Multiple env var naming schemes were in use (`SANITY_TOKEN`, `PUBLIC_SANITY_PROJECT_ID`, `SANITY_API_READ_TOKEN`). New developers couldn't tell which vars were client-safe, server-only, or Studio-specific.

**Decision:** Three prefixes: `PUBLIC_SANITY_*` (client-side, exposed in browser), `SANITY_API_*` (server-only credentials), `SANITY_STUDIO_*` (baked into Studio at deploy). Single `.env.local` at monorepo root; `astro.config.mjs` points Vite's `envDir` to `../../`. Legacy `SANITY_TOKEN` in `scripts/.env` remains for migration scripts.

**Consequence:** Clear auditing: grep for `PUBLIC_` to find everything exposed to the client. Server secrets never leak to browser bundles. Legacy naming in scripts is documented but not migrated.

---

## ADR-018: Doc-freshness mandate
**Date:** 2026-03-17 | **Status:** Accepted | **Agent:** Antigravity

**Context:** A forensic audit on 2026-03-17 found that all 6 in-repo meta-docs (`STATUS.md`, `CLAUDE.md`, `onboarding.md`, `decisions.md`, `SYNC.md`, `AGENTS.md`) had significant staleness. Three places incorrectly claimed "navigation is hardcoded" when it had been CMS-driven since 2026-03-13. `STATUS.md` was frozen at 2026-02-19. Root cause: no enforcement mechanism — agents updated code but not documentation.

**Decision:** Three rules: (1) Every commit that changes pages, schemas, config, or infrastructure MUST update the affected doc and bump "Last Updated" / "Last Verified" dates. (2) `SYNC.md` Rule 7 and `AGENTS.md` Rule 7 codify this. (3) Session-end checklist includes doc-freshness verification.

**Consequence:** Documentation drift becomes a protocol violation, not a forgotten task. Agents and humans share responsibility for enforcement. "Last Verified" dates make staleness immediately visible.

---

## ADR-019: Student projects removed from website-launch critical path
**Date:** 2026-03-17 | **Status:** Accepted | **Agent:** Codex

**Context:** The public student-project showcase exists in the codebase, but it is not required for the website launch and introduces avoidable launch coupling. The upcoming AI Creator Lab may become the natural source of featured projects, but that workflow is not yet operational.

**Decision:** Student projects are out of scope for website launch. They should be removed from launch navigation requirements and treated as a Phase 2 capability that may ship alongside or after the summer camp. The camp launch itself should optimize for registration, consent, Classroom operations, and repeatable provisioning rather than public showcase delivery.

**Consequence:** Website launch can proceed without `/projects` parity, editorial curation, or project showcase QA. Summer camp planning gains a cleaner sequence: launch the instructional and operational stack first, then publish featured outcomes once the cohort workflow is proven.

**Route status:** Both `/projects` and `/projects/[id]` return 404 via early return (commit `2f4f301`). Tests targeting these routes should be skipped, not fixed.
**Re-enable when:** AI Creator Lab has run, editorial curation workflow is tested, and showcase-ready projects exist in Sanity with `visibility: "Public"`.

---

## ADR-020: Platform state discipline system
**Date:** 2026-03-27 | **Status:** Accepted | **Agent:** Claude Code

**Context:** Platform state facts (DNS status, Vercel plan, active domains, deployment topology) were referenced across ~10 files (CLAUDE.md, docs/*.md, decisions.md, memory files). When facts changed (DNS cutover completed, hosting plan tier changed), stale claims persisted everywhere. No mechanism existed to detect or propagate state changes. Multiple agents (Claude Code, Antigravity, Codex) share the same workspace, compounding the drift.

**Decision:** Three-part system: (1) Probe script (`scripts/probe-platform-state.mjs`) queries live Vercel CLI and DNS state, writes `platform-state.yml` at project root. (2) Stale-claim checker (`scripts/check-stale-claims.mjs`) reads the YAML and greps documentation for contradictory patterns. (3) PreToolUse hook (`scripts/check-state-gate.sh`) gates memory writes — both local (Write/Edit to memory paths) and Basic Memory (write_note/edit_note) — behind a 2-hour TTL on the `probed_at` timestamp. Non-probeable facts (plan tier, billing) are human-maintained in the YAML's `manual:` section.

**Consequence:** Memory writes are blocked until platform state is verified. The `/verify-platform-state` command (or `npm run probe:platform && npm run check:stale`) refreshes state and surfaces stale claims. Stale patterns are co-located with facts, so updating a fact updates its detection patterns. The `platform-state.yml` file is gitignored (runtime state). `decisions.md` is scanned in history mode — matches are flagged as historical references, not errors.

---

## ADR-021: Remove hardcoded content fallbacks from BaseLayout and index.astro
**Date:** 2026-04-20 | **Status:** Accepted | **Agent:** Claude Code

**Context:** Forensic audit of Sanity/Astro surface on 2026-04-20 found that `BaseLayout.astro` and `index.astro` contained ~80 lines of hardcoded content duplicating populated CMS documents. Specifically: `orgSchema` (JSON-LD organization block) hardcoded phone/email/address/5 social URLs duplicating `siteSettings`; `FALLBACK_FOOTER_SECTIONS` duplicated the footer `navigation` document verbatim; `FALLBACK_VALUE_PROPS` and `FALLBACK_PROGRAMS` duplicated `homepageConfig.valueProps` and `homepageConfig.programHighlights`. Direct query confirmed all CMS documents are fully populated (`siteSettings` updated 2026-03-20, `homepageConfig` updated 2026-03-20, `navigation footer` matches fallback exactly). Fallbacks served as silent drift traps: editorial changes in Sanity would not propagate to JSON-LD or code-duplicated sections without a code deploy.

**Decision:** Delete the code-side duplicates. `BaseLayout.orgSchema` is now computed from `settings` after the `loadQuery` call, including an `address` parser that splits `"1 Ames Hill Drive\nSpringfield, MA 01105"` into JSON-LD `PostalAddress` parts. `FALLBACK_FOOTER_SECTIONS` deleted; `footerSections = footerNavDoc?.items || []`. `FALLBACK_VALUE_PROPS` and `FALLBACK_PROGRAMS` deleted from `index.astro`; value-props and programs sections wrapped in `{array.length > 0 && (...)}` so they disappear gracefully if ever emptied. `SITE_NAME` const removed; `schoolName` from `settings.schoolName` with defensive string fallback. `foundingDate: '2011'` retained as const (static fact, not in schema). `FALLBACK_NAV_ITEMS` was left in place pending Sanity nav reconciliation (see ADR-022).

**Consequence:** Phone/email/social links/footer structure/value props/program cards are now editorially live — editors modify them in Sanity Studio and ISR reflects within 5 min. Drift risk between `orgSchema` JSON-LD and visible contact info is eliminated. Footer and homepage sections fail closed (empty) rather than silently showing stale hardcoded content if CMS is unreachable.

**Reversal:** `git revert` the commit implementing this. The fallback arrays can be reconstructed from `navigation footer`, `homepageConfig.valueProps`, and `homepageConfig.programHighlights` via a GROQ export if needed.

---

## ADR-022: Calendar synced to CMS navigation; FALLBACK_NAV_ITEMS deferred
**Date:** 2026-04-20 | **Status:** Accepted | **Agent:** Claude Code

**Context:** Forensic diff between `BaseLayout.FALLBACK_NAV_ITEMS` and the live `navigation identifier=="main"` Sanity document revealed drift that existed since the calendar feature launched on 2026-03-23 (commit `cd59c98`). The code-side fallback was updated to add `/calendar` and retain `/projects` at the time of that launch, but the Sanity nav document was not. Separately, Sanity nav includes `/head-of-school` under the About dropdown (editorial choice, replaces `/about/guardian-alliance`) and `/athletics/basketball` under Athletics (program page launched later); fallback lacked both. Result: live nav has correctly shown Head of School and Basketball since the Sanity nav was updated, while Calendar has only shown in the fallback path (which only triggers if CMS fetch returns empty). Per ADR-019, `/projects` is intentionally off-nav and should not be restored.

**Decision:** Patched the `navigation identifier=="main"` document (doc id `9ab72c75-040f-4599-9a91-6c133e5e61d6`) via Sanity MCP to add a new top-level nav item `Calendar → /calendar` between News and Contact, matching the fallback's position intent. The patch creates a draft (`drafts.9ab72c75-...`) for editor review prior to publish. `FALLBACK_NAV_ITEMS` is retained in `BaseLayout.astro` for this PR to preserve graceful degradation until the Sanity nav draft is published; removal deferred to a follow-up PR.

**Reversal:** Discard the Sanity draft in Studio (doc → ⋯ → Discard changes). Published nav is unchanged by this decision.

**Note:** A pre-existing draft of the main nav document dated 2026-04-01 was overwritten by this patch. Document history in Sanity Studio preserves the prior draft state for recovery if needed.

---

## ADR-023: Remove studentProject URLs from dynamic sitemap
**Date:** 2026-04-20 | **Status:** Accepted | **Agent:** Claude Code | **Implements:** Hardening Plan item #1

**Context:** Per ADR-019 (2026-03-17), `/projects` and `/projects/[id]` routes return 404 via early return and are out of scope for website launch. However `apps/web/src/pages/sitemap.xml.ts` continued to query `studentProject` documents and advertise their URLs in the sitemap. Search engines crawling the sitemap were hitting 404s on every project URL — active SEO damage flagged in the 2026-03-30 Hardening Plan (item #1) but not yet remediated.

**Decision:** Removed the `studentProject` query from `sitemap.xml.ts` and the corresponding URL mapping. News articles continue to be advertised. Added inline comment referencing ADR-019. `STATIC_ROUTES` unchanged.

**Consequence:** Sitemap advertises only URLs that resolve to 200. Search engines will stop crawling dead `/projects/*` links on their next fetch.

**Reversal:** When ADR-019's re-enable condition is met ("AI Creator Lab has run, editorial curation workflow is tested, and showcase-ready projects exist in Sanity with `visibility: 'Public'`"), restore the studentProject query and mapping from git history.

---

## ADR-024: Editor-facing schema validation for alt text and nav URL format
**Date:** 2026-04-21 | **Status:** Accepted | **Agent:** Claude Code

**Context:** Editor-onboarding conversation surfaced that the editor guide was instructing the editor to remember rules that the schema was not enforcing: use relative URLs for internal links, always set alt text, etc. Asking editors to memorize validation rules that the CMS could enforce is a failure of schema design, not of the editor. The recipe was growing into a reference manual for rules that should be red-squiggles in Studio.

**Decision:** Added validation to the following schemas:
- `navigation.ts` `href` fields on both `navItem` and `navSubItem` — custom validation rejects URLs that do not start with `/`, `https://`, `mailto:`, or `tel:`. Descriptions in Studio name the allowed prefixes inline so editors see the rule when the field is focused, not in a separate document.
- `documents/news.ts` `image.alt` — `rule.required().warning(...)` surfaces a non-blocking warning when alt text is missing. Not an error — existing documents with empty alt won't be blocked from republishing, but editors will see the warning and be prompted to fill it.
- `documents/page.ts` `image.alt` — same treatment.
- `documents/homepageConfig.ts` `heroImage.alt` — same treatment.
- `blocks/heroSection.ts` `image.alt` — same treatment.

**Consequence:** Editor cognitive load drops. The recipe can shrink from a validation manual to a ~60-line flow document. Existing documents with empty alt text show warnings in Studio but continue to publish (warnings are non-blocking). New nav items cannot be saved with malformed URLs. Deeper schemas (`event.image.alt`, `program.image.alt`, `person.photo.alt`, `cardGrid.cards[].image`) are deferred — same treatment can be applied when those surfaces cause friction.

**Reversal:** `git revert` removes the validation rules. Descriptions can stay — they are always useful even without validation.

**Deferred (not done in this ADR):**
- Convert `navigation.items[].href` from `string` to a union with `reference` (pick page/program from dropdown) — eliminates slug-to-nav-URL drift entirely. Larger change; requires BaseLayout resolver update. Track separately.
- Apply alt-required warning to remaining schemas with `image` fields (`event`, `program`, `person`, `cardGrid.cards[]`, `textWithImage`). Same pattern, incremental.

**Operational note:** Studio must be redeployed (`sanity deploy` from `apps/sca-studio/`) for these validation rules to appear in the hosted Studio at `your-project.sanity.studio`. Local dev (`npm run dev:studio`) picks them up immediately.

---

## ADR-025: Repo shareability pass — README, docs restructure, CI, hygiene
**Date:** 2026-04-21 | **Status:** Accepted | **Agent:** Claude Code

**Context:** Repo state at start of 2026-04-21 was not shareable. Documentation was AI-framed (`CLAUDE.md` opened with "This file provides guidance to Claude Code"), stale (`STATUS.md` Last Verified 2026-03-30 with done items listed as remaining), and scattered (onboarding context split across `CLAUDE.md`, `docs/onboarding.md`, `STATUS.md`, `AGENTS.md`, `SYNC.md`). Ed's concrete ask: "when and how are we going to get actual well-designed HTML/CSS into the site that I don't have to massage through Claude" — the answer required the repo be in a state where a designer can show up without prep work by Ed.

**Decision:** Five-part pass, executed as two commits (`7b7fe6f` for docs + code, `ed7ec3f` for hygiene):

1. **Create `README.md` at repo root** as the single human-facing landing page. Verified every claim against tests: `npm run build:web` + `sanity build` + `BASE_URL=<prod> npx playwright test tests/ssr-verification.spec.ts` + curl HTTP checks on 19 routes. Delete `docs/onboarding.md` (superseded).
2. **Mark agent-protocol files explicitly.** `CLAUDE.md`, `AGENTS.md`, `SYNC.md` each get a header HTML comment: `AGENT-FACING — humans can skip this file.` Update internal references from `docs/onboarding.md` to `README.md`.
3. **Restructure `docs/`.** `docs/historical/` for reference-only (launch runbook, launch report, Vercel topology analysis, calendar handoff, GAM capability matrix). `docs/initiatives/` for active non-website initiatives (AI Workshop, classroom intelligence, paused student-project redesign). `docs/sessions/` for narrative (dialogues, walkthroughs, ideas, notes, comms). Top-level `docs/editor/` for editor recipes, `docs/image-spec.md` stays for image conventions. Delete one-off audit outputs (`site-visual-audit.md`, `visual-audit-review.html`) since they're regenerable from `tests/`.
4. **Add `.github/workflows/ci.yml`.** Minimal CI: `npm ci` → `npm run build:web` → `npx playwright install chromium` → run `tests/ssr-verification.spec.ts` against production. Runs on PRs and pushes to `master`. Uploads Playwright report on failure.
5. **Hygiene.** Expand `.gitignore` to cover `tmp-*/`, `_provision-output/`, `_visual-audit/`, `audit-tests/`, `site-comparison/`, `gdi/`, `planning/`, `templates/`, `.claude/`, `apps/sca-studio/sca-admin/`, root-level scratch patterns. Remove `@astrojs/node` from `apps/web/package.json` (unused, replaced by `@astrojs/vercel`). Remove stale `overrides` block from root `package.json`. Track `tests/ssr-verification.spec.ts` and `tests/editorial-review.spec.ts` (referenced by CI).

**Consequence:**
- `README.md` is now the single source of truth for current state; verified claims only.
- `docs/` reading order is obvious: start with `docs/editor/` if editor, `docs/historical/` if investigating past decisions, `docs/initiatives/` for non-website projects, `decisions.md` for architectural why.
- CI catches build failures and production SSR regressions automatically. First run happens on next PR after push.
- `git status` is usable again — scratch output no longer drowns out real changes.
- Repo passes a "could I share this publicly without embarrassment" bar along the specific dimensions of structure, naming, and freshness. (Other dimensions — design quality, homepage bespoke code — remain as-is; see deferred items.)
- Schema validation changes (ADR-024) are in the repo but **not yet in hosted Studio** until someone runs `sanity deploy`. Similarly, the Sanity `navigation main` draft from 2026-04-20 that adds `/calendar` is still pending Ed's publish in Studio.

**Reversal:**
- `git revert ed7ec3f` removes CI + hygiene.
- `git revert 7b7fe6f` removes the docs restructure and code changes (this also reverts the code changes from ADRs 021/023 since they share the commit).
- To preserve ADRs 021/023 while reverting doc reorganization: cherry-pick individual files out of 7b7fe6f.

**Deferred (tracked, not addressed in this ADR):**
- Homepage section-builder migration (still 583 LOC of bespoke `.astro` + 395-line scoped `<style>`). The single largest unpulled lever for design quality + editor control.
- Typecheck failure on `sanity:client` virtual module type declarations (102 errors, pre-existing).
- `web` Vercel staging project retirement (Hardening Plan item #6).
- Sanity webhook to `/api/revalidate` (Hardening Plan item #3).
- Health endpoint (Hardening Plan item #5).

---

## ADR-026: Homepage CMS-first via `useSections` toggle behind feature flag
**Date:** 2026-05-04 | **Status:** Accepted | **Agent:** Claude Code | **Implements:** ADR-025 deferred item #1 (homepage section-builder migration)

**Context:** ADR-025 listed homepage migration as the largest unpulled lever for design quality + editor control. The legacy `apps/web/src/pages/index.astro` was 583 LOC of bespoke markup + 395 LOC of scoped `<style>` and required a code change for any layout adjustment — an explicit blocker on the goal of handing layout off to a non-Claude developer or editor. A full template rewrite was rejected as too high-risk for a public homepage. Schema-side, `homepageConfig` was a bespoke-shape singleton with hand-rolled fields for hero / stats / value-props / programs / CTA — none of which could be reordered or replaced by editors without code.

**Decision:** Add CMS-first capability behind an editor-controlled feature flag, without removing the legacy template:

1. Add `useSections: boolean` (default `false`) and `sections[]` array (page-builder blocks) to `homepageConfig`. Keep all legacy fields. New "Sections (CMS Builder)" group set as the default tab in Studio; legacy fields re-grouped under `(Legacy)` labels.
2. `apps/web/src/pages/index.astro` branches on the toggle: when `useSections === true && sections.length > 0`, delegate to `SectionRenderer` (the same path used by `[...slug].astro`); otherwise the existing 540-line legacy template runs unchanged.
3. Add a tenth block, `latestNews`, so the section-driven homepage can keep its "Latest News" row (news is the most live content on the site). Block fetches via `loadQuery`, reuses `NewsCard.astro`, mirrors legacy `.hp-news` markup. Available on `homepageConfig.sections[]` and `page.sections[]`.
4. Render the icon SVG library in `CardGrid.astro` when `card.icon` is set. Schema field already existed; this closes the renderer gap so legacy value-props can be expressed as a `cardGrid` with parity.
5. Add `/` to Presentation `resolve.mainDocuments` and `homepageConfig` to `resolve.locations` so editors can preview the homepage from Studio.
6. Gate the legacy `news` GROQ query behind `!useSectionsMode` (per Codex review on PR #2). When toggle is ON, the legacy fetch is skipped — sections-mode performs exactly one news query (via the `LatestNews` block) instead of two.

Block count: 9 → 10. Strict equality check (`hpConfig?.useSections === true`) ensures `null`/`undefined`/`false` all route to legacy.

**Consequence:**
- Default state preserves existing behavior. Merging the change produces zero visible change until an editor opts in via Studio.
- Editor-controlled kill switch: unchecking `useSections` and republishing reverts to legacy in ≤300s (ISR cache) or instant via `VERCEL_ISR_BYPASS_TOKEN`. No deploy needed.
- Sections-mode delegates to the same dispatcher as `[...slug].astro`, so the homepage gains every section type pages already have. Editors can reorder blocks, add new ones, change copy without code.
- Phase 1b (next): editor populates `sections[]`, performs a behavioral draft-isolation test (verify a benign draft change appears on preview but not production), then publishes. Verifies preview-only isolation via `previewDrafts` perspective gated on `PUBLIC_SANITY_VISUAL_EDITING_ENABLED` (verified set on Preview only via `vercel env ls`).
- Phase 1c (later, separate ADR): once production has run on sections-mode for a sustained period and editors confirm parity, delete the legacy template from `index.astro` and the legacy fields from `homepageConfig`. Sanity is schemaless; field removal hides the UI but preserves data.

**Reversal:**
- Editor-level: uncheck `useSections` and publish. Instant.
- Code-level: revert the squash-merge commit produced when PR #2 lands on master. Do not rely on feature-branch commit SHAs, because they may be rewritten by rebase or squash merge.
- Schema removal: leaving the new fields in place is harmless; unused field data persists in the DB.

**Operational notes:**
- Studio must be redeployed (`cd apps/sca-studio && npx sanity deploy`) for the `useSections` toggle, `sections[]` array, and `latestNews` block to appear in the hosted Studio at `your-project.sanity.studio`. Local dev picks them up immediately.
- Visual deltas worth flagging during preview parity check: the legacy `.reveal` scroll-fade-in class is not applied to section blocks (animation regression). The legacy programs row has a dark navy background; the equivalent `cardGrid` is white-bg — editors choosing to migrate that section will see a visual identity change unless a `variant: 'navy'` option is added to `cardGrid` later.
- Vercel preview deployed cleanly on PR #2 at `sca-website-git-feat-homepage-sect-95c1a2-ed-oconnells-projects.vercel.app`.

**Deferred (tracked, not addressed in this ADR):**
- Programs row dark-navy variant on `cardGrid` — current sections-mode programs would be white-on-light. Address after editor decides whether the legacy navy chrome must be preserved.
- `.reveal` scroll-animation parity for section blocks.
- Phase 1c legacy-template removal (gated on production sign-off).
- News listing route hero CMS migration (`apps/web/src/pages/news/index.astro`) — separate route-level content model, separate PR.

---

## ADR-027: `videoEmbed` block + `/admin/block-library` reference page
**Date:** 2026-05-06 | **Status:** Accepted | **Agent:** Claude Code | **PR:** #4

**Context:** Two related needs converged. (1) The school president asked whether video can be embedded on the site — the existing schema had no answer. Sanity has no native video; the credible answer for a school site is to embed external YouTube/Vimeo with privacy-aware defaults rather than self-host. (2) A demo for editors, developers, and stakeholders was needed soon. The section/block system existed but was not visible on a single page — there was no artifact to point at when describing the page-builder model. Both needs were addressable in one self-contained PR without altering any production page.

**Decision:** Two changes shipped together on `claude/refine-local-plan-UVjyq`:

1. **Add `videoEmbed` as the eleventh page-builder block.** Editors paste a YouTube or Vimeo URL; the renderer emits a privacy-mode iframe (`youtube-nocookie.com` for YouTube, `player.vimeo.com` for Vimeo) with `loading="lazy"`, `referrerpolicy="strict-origin-when-cross-origin"`, and an editor-selected aspect ratio (`16/9`, `9/16`, `4/3`) applied via CSS classes — no inline styles. URL parsing is shared between schema validation (`apps/sca-studio/lib/video-embed.ts`) and the renderer (`apps/web/src/lib/video-embed.ts`) and uses an explicit host allowlist: `youtube.com`, `www.youtube.com`, `youtu.be`, `vimeo.com`, `www.vimeo.com`. Registered on `page.ts`, `homepageConfig.ts`, and `program.ts`. (`latestNews` is omitted from `program.ts` because it's a feed block; `videoEmbed` is general-purpose and a likely candidate for academic/athletic program pages, so it's included there.)
2. **Add `/admin/block-library` as a single internal reference page.** Prerendered, `noindex`. Renders every page-builder block (all 11) with a realistic sample payload. Each block has a `<details>` panel with file paths, allowed document types, sample payload as JSON, and short hand-written schema/renderer excerpts. The page header explicitly notes that `noindex` is not access control. Image fields are intentionally omitted from sample payloads so renderers reflow to text-only versions — no Sanity asset uploads, no PII, no licensed stock imagery. `latestNews` and `upcomingEvents` self-fetch real published content via `loadQuery`. The page also includes a "How to add a new block" recipe and a short explanation of the three reskinning layers (sitewide tokens, per-block visuals, editor-controlled fields).

Block count: 10 → 11.

**Consequence:**
- Editors gain a video block without a new third-party service or upload pipeline. Privacy posture is materially better than the default YouTube embed (`youtube-nocookie.com` reduces tracking and avoids cookies until interaction where applicable; not an absolute no-cookies guarantee).
- A single canonical demo URL exists for explaining the page-builder system to editors, designers, evaluators, or the president without writing more docs. It also serves as live developer documentation — schema/renderer file paths are visible on each block.
- Source-code exposure is minimized: excerpts are hand-written 5–10 line illustrations of the field shape and renderer shape, not copies of full source. Future agents revisiting this can decide whether full source is acceptable to publish; the current default is not.
- If a Content-Security-Policy is added later, `frame-src` must include `https://www.youtube-nocookie.com https://player.vimeo.com`.

**Reversal:**
- Editor-level: do not place `videoEmbed` on any document. The block's schema is harmless when unused.
- Code-level: revert the squash-merge commit on master. Do not rely on feature-branch SHAs (rebased / squashed by merge).

**Operational notes:**
- Studio must be redeployed (`cd apps/sca-studio && npx sanity deploy`) for the `videoEmbed` block to appear in the hosted Studio. This is the LAST step of the release sequence — it must come after the preview frontend has rendered the new block, otherwise editors see a block the frontend cannot render. Order: master CI green → production deploy green → `git push origin master:preview` → preview deploy green → `sanity deploy`.
- `/admin/block-library` is reachable by anyone with the URL. The `noindex` meta tag is search-engine guidance, not access control. The page makes this explicit in its own header.
- Sample YouTube URL in the block-library entry could not be HEAD-checked from the build sandbox (egress to `youtube.com` blocked); editor can swap it via Sanity if it becomes dead.

**Deferred (tracked, not addressed in this ADR):**
- A native Sanity video / Mux / Media Library Video integration. External-embed-only is the right floor for a school site; native hosting is a separate decision tied to bandwidth, accessibility (captions), and editorial workflow.
- A formal Content-Security-Policy for the site. Until added, the iframe security posture rests on the schema-side host allowlist plus the iframe attribute defaults.
- Authenticated `/admin/*` routes. The block-library page treats lack of auth as a documented constraint, not a defect.

---

## ADR-028: `/admin/reskinning-guide` — companion to the block library
**Date:** 2026-05-06 | **Status:** Accepted | **Agent:** Claude Code | **Companion to:** ADR-027

**Context:** The `/admin/block-library` page (ADR-027) shows *what* blocks exist and where their schema/renderer files live. After demoing the platform during a Sanity-vs-WordPress evaluation, a follow-up gap surfaced: the block library doesn't explain *how* visual changes are made — i.e., where colors, typography, spacing, and per-block layout live; how a future reskin would be approached; and what the boundary is between editor-controlled and developer-controlled changes. Walking someone through this verbally during a demo works, but the same person reading the repo cold the next day cannot reconstruct the model on their own. Adding a written, navigable reference closes the self-serve gap before the platform decision is made.

**Decision:** Add a single new internal page at `/admin/reskinning-guide` that explains the three-layer styling architecture with worked examples:

1. New file: `apps/web/src/pages/admin/reskinning-guide.astro`. Same conventions as the block-library page (`prerender = true`, `noindex` via `BaseLayout`, internal-only, no auth, URL is not access control).
2. Page structure: TL;DR → "three layers" overview (sitewide chrome, design tokens, per-block scoped CSS) → one section per layer with file paths and edit-when guidance → three worked examples (change accent color sitewide, view the alt theme via `?theme=alt`, add a navy variant to one block) → editor-vs-developer boundary table → "where do I edit X" decision tree → honest scoping list of what V1 doesn't cover (token catalog, accessibility annotations, visual regression baseline, live theme builder, Studio component docs).
3. Code snippets are syntax-highlighted via Astro's built-in `<Code>` component (Shiki). No new dependencies. No new schema. No new blocks. No edits to any existing component.
4. Cross-linked with the block library at top and bottom of each page.

**Consequence:**
- A developer who has never seen Astro or Sanity can read the reskinning guide alone and answer "where would I change X?" for any visual concern. Verbal narration during a demo is no longer required for the structural explanation.
- The two `/admin/*` reference pages now together cover the full surface: block library = vocabulary; reskinning guide = grammar.
- The guide explicitly demonstrates the existing `?theme=alt` mechanism (which was wired into `BaseLayout.astro` previously but undocumented). Linking to live `/?theme=alt` URLs lets a stakeholder see the theme switch in real time without any code changes.
- Page is prerendered, noindex, internal-only, with a header note that the URL is not access control. Same posture as the block library.

**Reversal:** revert the squash-merge commit that lands this PR on master. No schema removal needed (none added). No data migration needed (none ran). No Studio re-deploy needed.

**Operational notes:**
- No Studio re-deploy required (no schema changes).
- No `master:preview` push strictly required for the guide to render (production master will have it after merge), but pushing keeps the Sanity Presentation tool's iframe URL in sync as usual.
- The guide quotes specific token names (`--gold-500`, `--navy-800`, etc.) and file paths. If the token system is restructured later, the guide must be updated in the same PR per ADR-018 doc-freshness rule.

**Deferred (tracked, not addressed in this ADR):**
- A token catalog page enumerating every CSS custom property with its current value, semantic role, and override-safety annotation.
- Accessibility annotations per token (contrast ratios, WCAG flags) and per block (default/hover/focus/disabled state matrices).
- Visual regression baseline screenshots in CI.
- A live theme-builder UI in `/admin` that lets non-developers try color combinations and export a theme file.
- Editor-facing component notes inside Sanity Studio (custom input components rendered next to the schema picker).
- A migration to unset the legacy `body` field from `page` documents (orphan-data warning surfaced in Studio after PR #4's deploy synced local + hosted schemas). Tracked separately; ~30 minutes of work using `sanity migration create` + `unset()`.

These would belong in a fuller design-system documentation site, which is its own track separate from this V1 reference page.

---

## ADR-029: `/admin/pricing` — platform cost reference page
**Date:** 2026-05-06 | **Status:** Accepted | **Agent:** Claude Code | **Companion to:** ADR-027, ADR-028

**Context:** The Sanity-vs-WordPress evaluation depends in part on cost. The team needs a single page that lays out current platform costs, quotas, what we're paying for, what we're not paying for, what would push costs up, and how that compares to a typical WordPress setup for a similar school site. Without this page, every cost question requires either pulling up vendor pricing pages live during a meeting or relying on training-data memory that may be stale. This ADR adds the missing reference.

**Decision:** Add a single new internal page at `/admin/pricing` that catalogues the platform's billing surface:

1. New file: `apps/web/src/pages/admin/pricing.astro`. Same conventions as the existing `/admin/*` pages (`prerender = true`, `noindex` via `BaseLayout`, internal-only, no auth, header note that URL is not access control).
2. Page structure: TL;DR with current monthly spend → per-service deep dive (Vercel, Sanity, GitHub Actions, Codex) → "what we're not paying for and why" → headroom-on-current-plans table → "what would push costs up" enumeration → honest WordPress comparison → unknowns list.
3. All quoted prices verified 2026-05-06 against `vercel.com/pricing`, `sanity.io/pricing`, and `github.com/pricing` via WebFetch. Page header explicitly notes the verification date and instructs re-fetch if stale.
4. Cross-linked with `/admin/block-library`, `/admin/reskinning-guide`, and `/admin/platform-overview` at top and bottom.
5. The Codex/ChatGPT cost section is honestly labeled as "unknown" — the bot is installed but the billing dashboard is not visible from the codebase. Direction to verify is at `chatgpt.com/codex/cloud/settings/general`.

**Consequence:**
- A stakeholder evaluating "Sanity/Astro vs WordPress" can answer cost questions independently from the page rather than asking a developer.
- The WordPress comparison frames cost as roughly tied (both $15–140/month range for a school site), pushing the platform decision toward operational fit rather than line-item cost — which is honest.
- The "headroom" table makes it clear we have substantial room on every quota, so the conversation can be about long-term direction rather than imminent bill shock.
- The "honest unknowns" section keeps the page from overstating certainty about Codex spend, current month-to-date usage, or future pricing changes.
- All `/admin/*` pages now form a coherent set: block-library = vocabulary; reskinning-guide = grammar; pricing = budget; platform-overview = summary.

**Reversal:** revert the squash-merge commit. No schema changes, no Studio re-deploy needed. Same posture as ADR-028.

**Operational notes:**
- No Studio re-deploy required (no schema changes).
- No `master:preview` push strictly required (the page renders without preview-specific data), but standard practice after merge per existing convention.
- Pricing data goes stale; re-verify quarterly. The page header carries the verification date.
- The Codex cost section can be filled in once an operator confirms which ChatGPT account owns the GitHub App installation. Until then, treat that line item as "unknown but capped by whatever ChatGPT plan is active."

**Deferred (tracked, not addressed in this ADR):**
- Live month-to-date usage embedded on the page (would require Vercel + Sanity API integrations to fetch current quotas; out of scope for a reference page).
- A real WordPress-stack quote from a hosting provider for proper apples-to-apples comparison.
- Translation of the "honest unknowns" into a checklist for the operator to clear (Codex ownership lookup, dashboard usage check, domain registrar audit).
- Automated freshness check that flags the page if vendor pricing pages have changed materially since the last verification date.

---

## ADR-030: Remove unused SCAO new-school intake form, API route, and schema
**Date:** 2026-05-07 | **Status:** Accepted | **Agent:** Claude Code | **Supersedes scope of:** ADR-014

**Context:** ADR-014 introduced the `scaoNewSchoolIntake` document type, an SSR form at `/admin/scao-intake`, and an API handler at `/api/scao-intake` to capture intake data for prospective new schools under the SCAO expansion plan. The handler accepts unauthenticated POSTs and writes directly to Sanity via `SANITY_API_WRITE_TOKEN`, with a hardcoded field whitelist. A live GROQ count via the Sanity MCP server returned zero documents for `scaoNewSchoolIntake` in the production dataset, confirming the form has never been used. The launch report (`docs/historical/launch-report.md`) had previously flagged the unauthenticated write endpoint as a deferred hardening item (rate limiting / CAPTCHA). Rather than harden a feature that has produced no data, the simpler outcome is removal.

**Decision:** Remove the three intake artifacts and every active reference to them. Historical documentation is left untouched.

1. Delete `apps/web/src/pages/admin/scao-intake.astro`, `apps/web/src/pages/api/scao-intake.ts`, and `apps/sca-studio/schemaTypes/documents/scaoNewSchoolIntake.ts`.
2. Remove the import and registration of `scaoNewSchoolIntake` from `apps/sca-studio/schemaTypes/index.ts`.
3. Remove the `New School Intake` entry from the admin Operations menu in `apps/sca-studio/sanity.config.ts`. The `scaoBriefingRecord` entry stays in place and is deferred to a later cleanup.
4. Remove the Quick Links card pointing at `/admin/scao-intake` from `apps/web/src/pages/admin/scao-briefing.astro`. The briefing page itself stays in place.
5. Delete `tests/intake-form.spec.ts`. Remove the intake assertions from `tests/ssr-verification.spec.ts`, `tests/functional.spec.ts`, and `tests/briefing-dashboard.spec.ts` (the briefing quick-links count drops from 6 to 5).
6. Update `README.md`, `STATUS.md`, `CLAUDE.md`, and `AGENTS.md` to reflect the removed schema, the removed admin route, the document-type count (16 → 15), and the ADR count.
7. Leave `docs/historical/launch-runbook.md`, `docs/historical/launch-report.md`, and `docs/sessions/projects-archaeology-2026-05-05.md` untouched. These record the state of the system at a point in time.
8. `apps/sca-studio/schema.json` is regenerated by running `npx sanity schema extract` from `apps/sca-studio`. The dump is not hand-edited.

**Verification before authorization:**
- `mcp__Sanity__query_documents` returned `0` for `scaoNewSchoolIntake` in production (perspective `raw`, includes drafts).
- The same query also returned `0` for `mediaGallery`, `boardingFeature`, `admissionsPath`, and `scaoBriefingRecord`. These four schemas remain registered for now and are tracked for a later cleanup PR.
- A repo-wide grep mapped 19 files referencing `scao-intake` or `scaoNewSchoolIntake`. The 19 references resolve to 4 deletions, 12 active edits, and 3 historical files intentionally untouched.
- No public component, navigation document, or layout imports the form, the API route, or the schema. The only inbound link from a non-deleted page was the Quick Links card in `/admin/scao-briefing`, which is removed in this change.

**Consequence:**
- After deploy, `/admin/scao-intake` returns 404. No editors lose access to data because no data was ever submitted. `/api/scao-intake` is removed from the build output.
- Studio editors will no longer see the `New School Intake` document type in the Operations menu after the next `sanity deploy`. The hosted schema continues to serve the type until that deploy runs; this is harmless because no documents reference the type and no frontend route queries for it.
- One unauthenticated write endpoint to Sanity is removed. The launch report's deferred rate-limit / CAPTCHA hardening item is closed by removal rather than by adding code.
- The dedicated intake spec file is gone; the only CI-wired test (`tests/ssr-verification.spec.ts`) no longer asserts on the intake page.

**Reversal:** revert the squash-merge commit on master. The deletions and edits are recoverable in full from git history. The Sanity production dataset has no orphan data because the schema had zero documents. If reversal happens after a Studio redeploy, run `sanity deploy` again from the reverted branch to restore the schema in the hosted Studio.

**Operational notes:**
- A Studio redeploy is required to remove the schema from the editor UI: `cd apps/sca-studio && npx sanity deploy`. Without a redeploy, the hosted Studio continues to show the type. Production behavior is unaffected by the deploy timing.
- `master:preview` should be pushed after merge per existing convention so the Sanity Presentation tool iframe URL stays current.
- The schema dump (`apps/sca-studio/schema.json`) was regenerated via `npx sanity schema extract` and is committed alongside the source changes in this PR. The next `sanity deploy` produces the same dump.

**Deferred (tracked, not addressed in this ADR):**
- Removal of the four other unused schemas (`mediaGallery`, `boardingFeature`, `admissionsPath`, `scaoBriefingRecord`). All four have zero documents in production. Tracked for a separate PR.
- Hygiene cleanup: `apps/sca-studio/.env.production` is tracked in git despite containing only a non-sensitive preview URL; `apps/sca-studio/README.md` is Sanity scaffolding boilerplate. Both deferred to a separate hygiene PR.
- The `scripts/check-state-gate.sh` PreToolUse hook in `.claude/settings.json` references a script that exists only in `stash@{0}`. The hook is configured but does not currently enforce anything because the script is missing from the working tree. Deferred to a separate hygiene PR.

---

## ADR-031: Job Postings capability — schema, Studio group, `/careers` routes
**Date:** 2026-05-11 | **Status:** Accepted | **Agent:** Claude Code

**Context:** SCA had no way to publish a job posting on its own domain. The immediate driver was a regulated public notice that required ten consecutive business days of public visibility, mandatory structured fields (position title, duties, requirements, salary, worksite, application contact), a downloadable PDF artifact, and five-year audit retention. A bespoke one-off page was rejected as future-fragile; extending `news` was rejected because news has different editorial semantics (publication-time relevance, no posting window, no compliance retention). A neutral document type purpose-built for job postings is the additive minimum that handles the immediate regulated case AND any ordinary opening posted later.

**Decision:** Add one new Sanity document type `jobPosting` with a `postingType` discriminator (`standard` | `notice`), one new desk-structure group, and one new public route family at `/careers`.

1. **Schema** — `apps/sca-studio/schemaTypes/documents/jobPosting.ts` (new). Fields: `positionTitle`, `slug` (auto from title), `postingType` (radio, default `notice`), `postingStartDate`, `postingEndDate`, `worksiteAddress`, `salary`, `applicationEmail` (email validation), `duties` (string array, min 1), `requirements` (string array, min 1), `noticeDocument` (PDF file, conditionally required when `postingType === 'notice'`), `archived` (boolean). A custom validation rule enforces a 10-business-day minimum window between `postingStartDate` and `postingEndDate` when `postingType === 'notice'`; standard postings have no minimum delta. The validation counts weekdays only; holidays during the window are the operator's responsibility. Registered in `apps/sca-studio/schemaTypes/index.ts`. Document count goes 15 to 16.
2. **Studio desk group** — `apps/sca-studio/sanity.config.ts` gets a new `Job Postings` group between `Admissions` and the settings divider, with filtered child lists `Open` / `Closed / Archived` / `All`. The filter idiom uses `(postingEndDate + "T23:59:59Z") >= now()` so a posting stays in `Open` through the entirety of its end date. The pattern mirrors the existing `basketballReviewItems` filtered-list structure.
3. **Presentation resolver** — `mainDocuments` gets a `/careers/:slug` route entry and `locations.jobPosting` resolves to both the detail URL and the careers index. Editors can click "Preview" from the Studio to land on the live page.
4. **Frontend routes** — `apps/web/src/pages/careers/index.astro` and `apps/web/src/pages/careers/[slug].astro` (both SSR, `prerender = false`). Index lists Open postings only; closed postings stay reachable by direct URL for audit retention but are absent from the index and the sitemap. Detail page is indexable while Open and `noindex` once Closed or Archived. No JSON-LD `JobPosting` markup — that schema requires a `description` field the discriminator design deliberately omits; declined in favor of zero schema sprawl.
5. **Detail page rendering** — branded navy header (matches the existing `nd-header` no-image pattern in `news/[slug].astro`); structured content order is breadcrumb, single `<h1>`, status pill (text + color, not color-only), posting details as `<dl>` (not `<table>`), position duties `<ul>`, requirements `<ul>`, optional PDF download (only if `noticeDocument` exists, link text describes file format and size), optional hardcoded legal notice block (only if `postingType === 'notice'`, smaller-type subordinate container). All dates use `<time datetime>` for machine readability. The HTML page is the canonical accessible artifact; the uploaded PDF is the legal artifact, but lawyer-produced PDFs are typically not tag-accessible so the HTML must convey every field on its own. WCAG 2.1 AA target verified at 1440px via axe-core (zero violations on both routes).
6. **Hardcoded legal text** — the notice paragraph and the DOL Atlanta National Processing Center address live in `apps/web/src/pages/careers/[slug].astro` as plain template text. They are NOT a CMS field. Rationale: regulatory wording should not be editor-modifiable; a wrong copy/paste could invalidate the posting. If the wording or address ever changes, a code edit + deploy is the right intervention.
7. **No hero image, no hero image field** — the index page uses `PageHero` with its built-in radial-gradient navy fallback; the detail page uses a smaller branded navy header. A full-bleed photo on a regulatory posting reads as marketing dressing. Adding an image field to `jobPosting` would invite that mistake.
8. **Navigation** — adding a `Careers` link is an editor task on the `navigation` document (`identifier == "footer"`, `href: "/careers"`). No code change. Satisfies the ADR-024 `href` validation (leading `/`).
9. **Naming hygiene** — type ID, discriminator values, desk group label, route directory, page title, slug source, status vocabulary, default PR/commit naming, and local test-data conventions all use generic job-board language. Regulatory vocabulary is confined to the legally-required body paragraph that only renders for `postingType === 'notice'`. The repo is public; commit history is forever-searchable; future filings get harder if the history outs the pattern.

**Verification before authorization:**
- PDF asset pipeline smoke-tested via `scripts/smoke-pdf-upload.mjs` against the production dataset before any schema work: upload via `client.assets.upload('file', buffer, { contentType: 'application/pdf' })` succeeded, Sanity CDN served the asset at `https://cdn.sanity.io/files/wesg5rw8/production/{hash}.pdf` with `Content-Type: application/pdf` and matching byte size, deletion succeeded. The smoke test script self-cleans the asset and is kept in `scripts/` for future regression checks.
- Visual loop via the `playwright-skill` captured full-page screenshots of `/careers` and `/careers/[slug]` at six viewports (375 / 414 / 768 / 1024 / 1440 / 1920) for both `postingType` flavors. Zero horizontal-scroll, zero h1-count drift (the four extra h1s flagged by `page.locator` resolved to Astro's dev toolbar Shadow DOM, which does not ship to production), all conditional blocks rendered or hidden as designed.
- axe-core run via `tests/a11y-careers.mjs` at 1440px on both routes reported zero violations across `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`. 21 rule passes per route.
- `npm run build:web` completed successfully (Astro server build, Vercel adapter bundle). The existing `npm run typecheck` continues to fail on a pre-existing `sanity:client` virtual-module issue (tracked in `STATUS.md`); my new files were verified TS-clean by filtering the check output.

**Consequence:**
- After deploy, editors can create job postings from the Studio's Job Postings group. The first posting is a public notice; subsequent ordinary openings will reuse the same document type.
- `/careers` and `/careers/[slug]` go live. The page is indexable while a posting is Open; the URL remains live (with `noindex`) after the posting closes for audit retention.
- Adds zero schemaless-debt: no existing schema fields modified, no existing routes touched, no existing documents migrated.
- The standard editorial-content surface gains a parallel compliance-content surface. Both flow through the same schema, the same Studio group, and the same `/careers` route family.

**Reversal:** revert the squash-merge. The schema, routes, and desk group are additive; revert is a clean rollback. After revert, run `npx sanity deploy` from `apps/sca-studio` to remove the type from the hosted Studio (the dataset retains any documents but they become unrenderable in the Studio UI until the schema is re-added).

**Operational notes:**
- `npx sanity deploy` from `apps/sca-studio` is required to make the new document type visible in the hosted Studio. The production frontend does not depend on the deploy; it queries the dataset directly.
- `git push origin master:preview` per existing convention so the Presentation tool iframe URL stays current.
- The Atlanta NPC address hardcoded in `careers/[slug].astro` was the address documented on the DOL OFLC site at the time of writing. Immigration counsel should confirm it matches the address on the filed PERM application before the first public notice is published.
- The footer nav entry for `/careers` is an editor task on the `navigation` document — no code change. After the Studio deploys, an editor adds it to the footer in Sanity.

**Deferred (tracked, not addressed in this ADR):**
- Studio-side validation of the 10-business-day floor was verified by code review against the documented Sanity v3 validation API but not yet exercised in the Studio UI; will be confirmed at the first real document publish on the hosted Studio.
- Federal regulation requires physical worksite posting on a bulletin board for the same 10-business-day window. Out of software scope; the operator handles separately.
- Five-year retention of dated evidence (screenshots, archived PDF) is the operator's recordkeeping responsibility; not enforced by software.

---

## ADR-032: Sanity webhook -> on-demand ISR revalidation
**Date:** 2026-05-11 | **Status:** Accepted | **Agent:** Claude Code | **Extends:** ADR-021 (SSR cost review, Phase 3)

**Context:** Public pages on the site are SSR-rendered behind Vercel ISR with a 300-second edge cache. Until this change, an editor who hit Publish in Sanity had to wait up to 5 minutes for the new content to appear on production. The `/api/revalidate` endpoint (built per ADR-021) has existed since the cost review but was never wired to Sanity. The recent `jobPosting` date-correction surfaced the lag directly: the operator changed `postingEndDate` from 2026-05-26 to 2026-06-15 in the Studio, Sanity stored the change immediately, but the live page kept rendering 2026-05-26 for several minutes until the ISR window expired or a new deploy busted the cache. Closing that loop is the smallest visible improvement to the editor workflow.

**Decision:** Add a Sanity GROQ-powered webhook that fires on document create / update / delete and POSTs to a new `/api/sanity-webhook` endpoint, which verifies the HMAC signature and asks Vercel to revalidate the affected paths. Only document types with public-facing pages are covered. The endpoint is additive; the existing `/api/revalidate` stays in place for admin manual use.

1. **New endpoint `apps/web/src/pages/api/sanity-webhook.ts`.** Verifies the Sanity webhook signature inline using Node's `crypto.timingSafeEqual` against an HMAC-SHA256 of `${timestamp}.${rawBody}` (Stripe-style; the format Sanity uses). Required env vars: `SANITY_WEBHOOK_SECRET` (shared with the Sanity webhook config), `VERCEL_ISR_BYPASS_TOKEN` (reused from existing `/api/revalidate`), and `SITE_URL` (or `VERCEL_URL`). No new npm dependencies introduced — the spec disallowed them and `@sanity/webhook` would have been the alternative.
2. **New helper `apps/web/src/lib/paths-for-document.ts`.** Pure function: takes `{ _type, slug }` and returns the list of public routes that depend on that document. The map is the only thing future devs need to edit when a new public document type is added. Mapping:
   - `jobPosting` -> `/careers`, `/careers/<slug>`
   - `news` -> `/news`, `/news/<slug>`, `/` (homepage carries the LatestNews block)
   - `page` -> `/<slug>`
   - `program` -> `/<slug>`
   - `event` -> `/calendar`, `/` (homepage carries the UpcomingEvents block)
   - `alumniStory` -> `/athletics/basketball-alumni`
   - `navigation`, `siteSettings`, `homepageConfig` -> a curated list of well-known top-level routes (`/`, `/news`, `/calendar`, `/careers`, `/athletics/basketball-alumni`). Catch-all CMS pages are not enumerated and fall back to normal ISR delay.
   - Anything else -> empty list (200 no-op).
3. **New helper `apps/web/src/lib/revalidate.ts`.** Extracts the path-busting loop (Vercel `x-prerender-revalidate` HEAD fan-out) so both `/api/revalidate` and `/api/sanity-webhook` use the same code. The existing `/api/revalidate` was refactored to use it; behavior is unchanged for callers.
4. **Defense-in-depth checks in the handler.** Reject if `SANITY_WEBHOOK_SECRET` or `VERCEL_ISR_BYPASS_TOKEN` is missing from the deploy (503). Reject if signature is missing or invalid (401). Skip if `_id` looks like a draft or version ID — the webhook config also blocks drafts/versions at the source, so this is defense-in-depth, not the primary gate. Return 200 (no retry) for documents whose `_type` is not in the public-types whitelist or for which the path map returns empty.
5. **Idempotency.** The Sanity webhook may deliver duplicates. We do not dedupe — revalidation is itself idempotent (busting an already-fresh cache is a no-op) and the only cost of a duplicate delivery is one extra HEAD per path. The `idempotency-key` header IS logged for traceability.
6. **Manual test helper.** `scripts/test-sanity-webhook.mjs` signs a synthetic payload with the local secret and POSTs it to a target URL (defaults to production). Useful for verifying signature parsing, path mapping, and end-to-end reachability without needing Sanity to fire a real webhook. Negative testing (`--bad-secret`) exercises the 401 path.

**Webhook configuration (one-time, manual, in `manage.sanity.io`):**

| Field | Value |
|---|---|
| URL | `https://www.springfieldcommonwealthacademy.org/api/sanity-webhook` |
| Trigger on | Create, Update, Delete |
| Filter (GROQ) | `_type in ["jobPosting", "news", "page", "program", "event", "alumniStory", "navigation", "siteSettings", "homepageConfig"]` |
| Projection (GROQ) | `{ _id, _type, slug }` |
| HTTP method | POST |
| API version | `v2021-03-25` (default) |
| Drafts | OFF (default) |
| Versions | OFF (default) |
| Secret | Generate via `openssl rand -base64 32`. Same value goes into the Vercel env var `SANITY_WEBHOOK_SECRET` (Production + Preview). |

**Failure mode:** if the endpoint is misconfigured, the secret rotates without updating both sides, the webhook is disabled, the path map omits a document type, or the underlying Vercel revalidation request fails — **nothing breaks**. The page falls back to the normal ISR 300s edge-cache expiry. Visitors never see incorrect content; they may see slightly-old content for at most about 5 minutes (same as today). The webhook is a latency optimization, not a correctness gate.

**Verification before authorization:**
- The signature verification algorithm was self-checked against a known input using Node's `crypto` (HMAC-SHA256, base64url) and `crypto.timingSafeEqual`. Computed signature round-trip-verified true; same payload with a wrong secret rejected false.
- `npm run build:web` succeeded with the new endpoint and helpers; the Vercel adapter bundled the new function. Pre-existing `astro check` issues unchanged.
- The handler returns 200 for every signed-valid request regardless of whether the document is in the public-types whitelist — Sanity does not retry 200s, so no spam.
- The Sanity webhook documentation (canonical at sanity.io/docs/content-lake/webhooks and sanity.io/docs/nextjs/validating-sanity-webhooks-nextjs) was consulted to confirm signature header name (`sanity-webhook-signature`), idempotency header (`idempotency-key`), and the default off-for-drafts behavior.

**Consequence:**
- After Vercel env vars are set and the Sanity webhook is created, every Studio publish triggers an automatic edge-cache bust for the affected paths within seconds. Editors no longer wait 5 minutes to see their changes.
- One new public endpoint surface (signed; rejects unsigned requests).
- One small map to maintain when new public document types ship. Documented inline in `paths-for-document.ts` and called out in this ADR.
- Vercel function invocations increase by ~1 per Sanity publish (a handful per day for SCA). Far below the plan's monthly invocation cap.
- No new services, queues, dependencies, or billing surfaces. Sanity webhooks are free on all plan tiers.

**Reversal:**
1. Disable the webhook in `manage.sanity.io` -> API -> Webhooks (single toggle). Editors immediately revert to the 5-minute ISR wait. No code change needed.
2. To fully back out, revert this ADR's commit. The endpoint and helpers vanish; `/api/revalidate` continues to work via the same shared helper (which would also be reverted, restoring the original inline implementation).

**Operational notes:**
- The webhook secret is shared state between Sanity and Vercel. If the operator rotates one without updating the other, every publish-fired webhook starts returning 401 and the cache stops busting on time. Symptoms: editors complain about the 5-minute wait again. Diagnosis: check Vercel function logs for `Invalid signature` from `/api/sanity-webhook`.
- The Sanity webhook config is out-of-band state — it lives in `manage.sanity.io`, not in this repo. If someone deletes the webhook, revalidation silently stops. Mitigation: documented in `STATUS.md` and a periodic check via `scripts/test-sanity-webhook.mjs` confirms the endpoint is reachable and signature verification works.
- Adding a new public document type requires a one-line addition to `paths-for-document.ts` AND a regex update to the Sanity webhook's GROQ filter in `manage.sanity.io`. Forgetting either is not a correctness bug — the new type's pages just keep using the 5-minute ISR delay.

**Deferred (tracked, not addressed in this ADR):**
- Rate limiting on `/api/sanity-webhook`. The endpoint is signature-gated, so abuse requires the secret. Adding Vercel-level rate limiting is sensible defense-in-depth but not blocking.
- Wiring into a deployment-tracking dashboard (e.g., showing "last webhook received at X" on an admin page). Useful but not required for correctness.
- Catch-all-page revalidation when `siteSettings` changes. Today, only the curated top-level paths bust; CMS-driven pages at `/<slug>` fall back to ISR delay. If editors update siteSettings frequently and need every page fresh immediately, the path map can be extended.

---

## ADR-033: Webhook hardening, CDN propagation delay, and env-var rotation procedure
**Date:** 2026-05-12 | **Status:** Accepted | **Agent:** Claude Code | **Extends:** ADR-032

**Context:** Activating the webhook from ADR-032 surfaced six issues that the original ADR did not anticipate. None invalidated the architecture, but each one cost real time to diagnose. This ADR records the fixes plus the operational procedures that prevent the same issues from recurring.

The six issues, in the order they were discovered:

1. **API routes were silently being stripped at build time.** Astro 5 defaults `output` to `'static'`. Without `export const prerender = false` on each API route, Astro built each handler file to `"Contents removed by Astro as it's used for prerendering only"` — Vercel then returned `FUNCTION_INVOCATION_FAILED` at runtime. Both `/api/revalidate` and `/api/sanity-webhook` were affected. The original `/api/revalidate` (per ADR-021) was likely broken since the day it shipped; nobody noticed because nothing called it.

2. **`VERCEL_URL` was the wrong base for revalidation.** Vercel's ISR cache is keyed per `(host + path + scheme + deployment)`. Sending the bypass HEAD to the auto-generated deployment URL (`sca-website-xxx.vercel.app`) revalidated a cache namespace nobody visits. The production alias (`www.springfieldcommonwealthacademy.org`) is its own cache namespace. Returns 200 with `X-Vercel-Cache: HIT` — looks fine, busts nothing. Per Vercel docs ("on-demand revalidation applies only to the domain and deployment where triggered"), this is documented behavior, not a bug; we were holding it wrong.

3. **`echo "..." | vercel env add` appended a trailing newline to the stored env value.** `echo` adds `\n` unless explicitly suppressed. Vercel's CLI piped the newline into the value verbatim. Both `SANITY_WEBHOOK_SECRET` and `SITE_URL` ended up with trailing `\n` in storage. HMAC and URL comparisons silently failed.

4. **Vercel's env-var UI overwrites the value with empty when "Edit" + "Save" is clicked without re-pasting.** Sensitive vars don't display the stored value in the Edit dialog (security feature); the field shows a placeholder. Saving without typing leaves the value empty. We hit this loop multiple times trying to "verify" the value.

5. **Webhook 200 responses were misleading.** Our endpoint can return 200 + `vercelCache: REVALIDATED` even when the cached re-render is actually stale. This happens when Sanity's CDN (`useCdn: true` in the Astro client) hasn't propagated the publish yet — Vercel re-renders against stale Sanity data and caches the stale render. The 5-minute observed propagation is then the natural ISR expiry, not the webhook doing anything useful.

6. **Webhook secret rotation via UI is unreliable; CLI via stdin is the only safe path.** Browser paste into sensitive fields can fail silently (clipboard manager interference, security policy, etc.). The CLI accepts piped stdin deterministically but you have to bypass interactive prompts AND avoid `echo`'s trailing newline.

**Decision:** Apply six concrete fixes and one operational procedure.

1. **`export const prerender = false` is mandatory on every API route file.** Documented in comments at the top of both endpoints. Verifiable: a properly-built `.vercel/output/_functions/pages/api/*.astro.mjs` file should contain the actual handler code, not `"Contents removed by Astro"`.

2. **`SITE_URL` env var is required, no fallback.** `apps/web/src/lib/revalidate.ts` no longer exposes a `getSiteUrl` helper with fallbacks. Both endpoints fail-fast with 503 if `SITE_URL` is missing or has whitespace. The value must be the production canonical URL with scheme (`https://www.springfieldcommonwealthacademy.org`). Vercel's `VERCEL_PROJECT_PRODUCTION_URL` could serve as a future fallback, but with four production aliases (apex + www on two domains) the "shortest production custom domain" rule is ambiguous; explicit is correct.

3. **`requireCleanEnv(name, value)` guards every env-var read.** New helper at `apps/web/src/lib/env.ts`. Throws if the value is missing, empty, or has leading/trailing whitespace. Both API endpoints call it at handler start and return 503 (retry-eligible) on failure. Surfaces the whitespace class of bug immediately instead of letting it produce silent HMAC mismatches.

4. **Signature verification now has replay protection.** Extracted from the endpoint to `apps/web/src/lib/verify-sanity-signature.ts`. Rejects timestamps more than `MAX_SKEW_MS = 5 * 60 * 1000` ms from now in either direction. Sanity's own `@sanity/webhook` does not currently enforce a freshness window; we add one. Sanity retries within ~90s, well inside the window.

5. **Webhook handler sleeps 2 seconds before triggering revalidation.** Equivalent to next-sanity's `parseBody(..., waitForContentLakeEvent: true)`. Lets Sanity's CDN propagate the publish so Vercel's re-render fetches fresh data. Verified empirically: with the delay, propagation dropped from 268-293s (ISR fallback) to ~1s. The 2s wait is well under Vercel's 30s function timeout.

6. **Env-var rotation procedure.** Generating + setting the secret via the Vercel UI or `echo | vercel env add` is unreliable. The reproducible procedure:
   - Write the secret to a temp file via Node `fs.writeFileSync` (no trailing newline).
   - Use Node `child_process.spawn` to invoke `vercel env add NAME ENV` with `stdio: ['pipe', 'inherit', 'inherit']`; pipe exactly the file bytes via `child.stdin.write(Buffer.from(secret))` and `child.stdin.end()`. Do NOT include a `y\n` prefix; do NOT add a trailing newline. Do NOT use `--sensitive` flag (the CLI's --sensitive code path appears to skip stdin entirely; if sensitive masking is desired, toggle it in the UI after the value lands).
   - Copy to clipboard for the Sanity side via `child_process.spawnSync('clip', [], { input: buf })` — bypasses any shell mangling.
   - Verify via `vercel env pull` + Node-based byte inspection (NOT `cat | awk`, which strips trailing characters around `=` and gives misleading length counts).

**Verification:**
- Production webhook attempts log shows `200 OK, vercelCache: REVALIDATED` for both paths within ~3 seconds of a Studio publish.
- End-to-end smoke test on a throwaway archived `jobPosting`: published → propagated to production in 1 second (vs. 268-293s without the 2s delay).
- `requireCleanEnv` caught the dirty `SANITY_WEBHOOK_SECRET` AND `SITE_URL` on first request after deploy, returning a structured 503 instead of a silent 401.
- Unit tests at `tests/verify-sanity-signature.spec.ts` cover all signature-verification branches including replay rejection.
- Stale-claim check passes against the refreshed `platform-state.yml`.

**Consequence:**
- Editor publish → live on production in ~3 seconds. Operator workflow improvement is the practical win.
- One additional env var to maintain (`SITE_URL`); a 2-second per-webhook function execution cost (negligible on Vercel quotas).
- Future operators have explicit documentation of the env-var rotation procedure and the per-hostname ISR cache behavior. The next person to set this up should not burn the time we did.

**Reversal:** Disable the Sanity webhook in `manage.sanity.io` to fall back to the 5-minute ISR delay. The endpoint can stay in place harmlessly. Full code revert would also restore `getSiteUrl` with fallbacks and remove `requireCleanEnv`; not recommended.

**Operational notes:**
- `SITE_URL` is set in Vercel as `https://www.springfieldcommonwealthacademy.org` (Production + Preview). If a different canonical alias is ever chosen (e.g., apex-only), update there and redeploy.
- The 2-second CDN delay is a magic number tuned to current Sanity behavior. If Sanity's CDN propagation slows down (or speeds up), revisit `apps/web/src/pages/api/sanity-webhook.ts`. If significantly slower, consider switching the Astro Sanity client to `useCdn: false` (cost: more direct API calls) rather than extending the delay further.
- The Sanity webhook secret should be rotated approximately annually or any time it might have been exposed. Use the rotation procedure in this ADR; do NOT use the UI for the value entry.

**Deferred (tracked, not addressed in this ADR):**
- Adding `@sanity/webhook` as a devDep so the cross-check tests in `tests/verify-sanity-signature.spec.ts` activate. Currently they skip; activating would catch any future drift between our inline verifier and the official library.
- Rate limiting on `/api/sanity-webhook` via Vercel Firewall. Signature gating is the primary defense; Firewall would be defense-in-depth.
- A small admin page showing the last few webhook attempts + their `x-vercel-cache` status, so editors can self-diagnose "did my publish actually propagate?". Today they have to ask the developer.
