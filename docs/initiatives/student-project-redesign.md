# Student Project System: Redesign Recommendations

**Date:** 2026-03-06
**Status:** Draft — pending team review

---

## Executive Summary

The student project system has two identities fighting for one URL:

1. **Operational dashboard** — Drive provisioning status, student email, GAM agent state. Internal, admin-facing.
2. **Public showcase** — Curated presentation of finished student work. External, marketing-facing.

The schema was designed for #2 but the frontend only implements #1. 13 of 20 fields go unrendered. The fix is not to delete or rebuild — it's to **split the views** and **render what already exists**.

---

## Architecture: One Document Type, Two Views

**Recommendation: Keep a single `studentProject` document type.** Do not split into two Sanity types.

Why: The provisioning data (Drive folder, status) and the showcase data (body, gallery, images) describe the same project. Two document types means duplicate data entry, broken references, and sync headaches. Instead, use the existing `visibility` field as the gate between the two views.

### URL Structure

| Route | Audience | What it shows |
|-------|----------|---------------|
| `/admin/projects` | Staff/admin | All projects, provisioning status, Drive links, email. The current `/projects` page, moved. |
| `/projects` | Public | Only `visibility == "Public"` AND `status == "Complete"` projects. Showcase view with images, descriptions, links. |
| `/projects/[slug]` | Public | Full project detail page with hero image, body text, gallery, external links. |

**The `/admin/projects` route** keeps the current operational view almost unchanged — status badges, student email, Drive button. No public visitors will find it.

**The `/projects` route** becomes the showcase — filterable card grid showing only curated, finished work.

### The Visibility Gate

The `visibility` field already exists (`Private` / `Public`) but has a **critical bug**: the current frontend query doesn't filter on it. All projects display regardless.

Corrected query for the public showcase:
```groq
*[_type == "studentProject" && visibility == "Public" && status == "Complete"]
```

Admin view continues to show everything (no filter).

### Curation Workflow

1. **Teacher creates** a `studentProject` in Studio → status auto-sets to `Pending`
2. **GAM agent provisions** the Google Drive folder → status moves to `Complete`
3. **Student works** in the Drive folder (builds app, writes paper, creates film)
4. **Teacher populates** the showcase fields: summary, body, featured image, gallery, external URL
5. **Teacher sets** `visibility: "Public"` → project appears on the public `/projects` page
6. **Teacher optionally sets** `featured: true` → project appears in a "Featured Projects" section or homepage highlight

No new roles, no approval queue, no workflow engine. The `visibility` toggle IS the approval.

---

## What to Build: Prioritized Tiers

### Tier 1 — Render What Exists (Zero Schema Changes)

The highest-value work is purely frontend. These fields already exist in the schema but aren't queried or rendered:

| Field | Where to render | What it does |
|-------|----------------|--------------|
| `summary` | Card grid on `/projects` | 300-char project description under the title |
| `featuredImage` | Card thumbnail + detail page hero | Visual identity for the project |
| `body` | Detail page | Full Portable Text project description |
| `gallery` | Detail page | Image gallery with lightbox |
| `externalUrl` | Detail page | "View Live Project" button |
| `student` (ref) | Card + detail page | Student name (resolved from `person` doc) |
| `program` (ref) | Card + detail page | Program name + filter option |
| `year` | Card + filter | Academic year badge |
| `featured` | Card grid | Gold star / "Featured" badge, sort to top |
| `slug` | URL | Use `/projects/[slug]` instead of `/projects/[id]` |

**Effort:** ~1 day of frontend work. New listing page, new detail page, move current pages to `/admin/projects`.

### Tier 2 — Minor Schema Additions

| Feature | Schema change | Why |
|---------|--------------|-----|
| **Project category** | Add `category` enum: Code, Research, Film, Art, Design, Other | Enables filtering by type on the listing page |
| **YouTube/Vimeo embed** | Add `youtube` object type to `body` Portable Text array | Students who make videos can have them embedded inline |
| **Multiple links** | Change `externalUrl` (single URL) to `projectLinks[]` array of `{label, url, icon}` | A project may have a live demo AND a GitHub repo AND a video |
| **Tech/tool tags** | Add `tags[]` string array | "Built with React, Python, Figma" — useful for filtering and credibility |

**Effort:** Half-day of schema work + corresponding frontend components.

### Tier 3 — Don't Build, Just Link

| Feature | Why not |
|---------|---------|
| **iframe embed of live apps** | Student hosting expires, XSS risk, poor mobile UX. Use screenshot + "View Live" button instead. |
| **Google Docs/Slides embed** | Privacy issues (requires public sharing), poor mobile UX. Link to Drive instead. |
| **Figma embed** | Account-dependent, poor mobile UX. Screenshot + link. |
| **Mux video hosting** | Cost not justified. YouTube/Vimeo covers 90% of cases for free. |
| **GitHub README rendering** | Over-engineering. Link to the repo. |
| **3D model viewer** | Too niche. Revisit if 3D curriculum emerges. |
| **Student-submitted content** | No auth system. Teachers curate via Studio for now. |

For all Tier 3 items: store the URL and render a styled "View on [Platform]" button.

---

## The Google Drive Button Question

**Keep it, but move it.**

- On the **admin view** (`/admin/projects`): Drive button stays front-and-center. This is its natural home.
- On the **public showcase** (`/projects/[slug]`): Drive button only appears if the project's Drive folder is explicitly set to public. Most won't be — student work-in-progress shouldn't be browsable by random visitors. The `externalUrl` and `projectLinks[]` fields handle public-facing links (deployed app, GitHub, YouTube).

The provisioning pipeline (GAM agent → Drive folder) continues unchanged. It just stops being the star of the public-facing page.

---

## Content Types: How the Showcase Handles Diversity

The researcher identified that different project types need different presentation — but the same schema handles all of them through flexible fields:

| Project Type | Hero Media | Body Content | Primary Link | Tags |
|-------------|-----------|-------------|-------------|------|
| **React/web app** | Screenshot (`featuredImage`) | Technical write-up | Live demo URL | React, JavaScript, Vercel |
| **Research paper** | Data visualization or cover | Abstract + methodology | PDF download | Python, Data Analysis |
| **Short film** | Film still | Director's statement | YouTube embed in body | Premiere Pro, Storytelling |
| **Art/Design** | Best piece (`featuredImage`) | Artist statement | Portfolio link | Illustration, Procreate |
| **Hardware project** | Photo of build | Build log + specs | Video walkthrough | Arduino, 3D Printing |
| **Business plan** | Pitch deck slide | Executive summary | Presentation link | Finance, Entrepreneurship |

No special-case code per type. The category field enables filtering; the flexible body + links + gallery handle any content shape.

---

## Immediate Fixes (Do Before Redesign)

1. **Add visibility filter** to the current `/projects/index.astro` query. Right now all projects display regardless of the `visibility` field. This is a bug.

2. **Move current pages** to `/admin/projects` as-is, before building the showcase. This derisks the transition — the ops view keeps working while the showcase is developed.

---

## What NOT to Build

- **Form builder / student submission portal** — No auth system exists. Teachers enter content in Studio. Revisit only if student count exceeds what 2-3 teachers can manually curate.
- **Approval workflow engine** — The visibility toggle is the approval. Don't add states, queues, or notification chains.
- **Per-student portfolio pages** — Tempting but premature. Start with projects as the unit, not students. A student's projects can be found by filtering by their name.
- **Search** — With <200 students and likely <50 public projects, filters (year, program, category) are sufficient. Search is overhead.
- **Comments / likes / social features** — This is a school showcase, not a social platform.

---

## Schema Changes Summary

### Keep As-Is (no changes needed)
- `title`, `slug`, `student`, `studentEmail`, `program`, `year`
- `summary`, `body`, `featuredImage`, `gallery`, `externalUrl`
- `featured`, `visibility`
- `status`, `idempotencyKey`, `provisioningData` (entire provisioning group)

### Add (Tier 2, when ready)
- `category` — string enum: Code, Research, Film, Art, Design, Other
- `tags[]` — string array for tech/tool tags
- `projectLinks[]` — array of `{label, url, linkType}` replacing single `externalUrl`
- `youtube` object type added to `body` Portable Text block types

### Remove
- Nothing. Every existing field has a purpose in either the ops view or the showcase view.

---

## Implementation Sequence

```
1. Bug fix: Add visibility filter to current query         [30 min]
2. Move current pages to /admin/projects                   [1 hour]
3. Build public /projects listing (card grid + filters)    [3-4 hours]
4. Build public /projects/[slug] detail page               [3-4 hours]
5. Add Tier 2 schema fields (category, tags, links)        [2 hours]
6. Update detail page for Tier 2 fields                    [2 hours]
7. Populate 3-5 example projects with full showcase data   [1-2 hours]
```

Total: ~2 days of focused work for the full showcase system.

---

## Decisions (2026-03-06)

1. **Slug URLs** — Confirmed. Public showcase uses `/projects/[slug]` (human-readable). Admin view can continue using `_id`.

2. **Homepage integration** — Not yet, but planned. Note: featured projects should eventually surface on the homepage, likely as a section block type (`featuredProjects`) or via `homepageConfig`.

3. **Program pages** — Not yet, but planned. The `program` reference already enables the query: `*[_type == "studentProject" && program._ref == $programId && visibility == "Public"]`. Wire this up when program detail pages are built.

4. **Google Drive on public showcase** — No. Public showcase links to `externalUrl` / `projectLinks` only. Drive folders stay on the admin view. Exception: during stakeholder demos, the admin view's Drive links are useful for showing "the plumbing" behind the scenes.

## Sample Content Strategy: Periodic Table Projects

Since test projects follow a periodic table naming convention (Hydrogen, Helium, Lithium, Beryllium, Boron, Carbon...), each element should represent a **different project type** with realistic showcase content. The element's real-world properties and uses provide natural creative material for mock student projects.

This serves two purposes:
- **Demo quality**: Stakeholders see a polished, varied showcase — not lorem ipsum
- **System stress test**: Diverse content types prove the schema handles everything

See companion doc: `docs/periodic-table-projects.md` (creative brief for sample content)
