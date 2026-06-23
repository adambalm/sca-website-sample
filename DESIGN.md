# DESIGN.md — Springfield Commonwealth Academy

**Last verified:** 2026-04-21

Token, rule, and rationale in one file. Format follows the community
[`awesome-claude-design`](https://github.com/VoltAgent/awesome-claude-design)
convention. Values in `design-tokens.json` (W3C DTCG 2025.10) at repo root;
CSS at `apps/web/src/styles/global.css` + `themes/*.css` is the runtime source
of truth.

## 1. Visual Theme & Atmosphere

Institutional prep-school. Dignified, confident, typographic — not flashy.
Large serif display type over restrained sans-serif body. Navy chrome, gold as
an accent used sparingly for emphasis and focus. Generous whitespace,
letter-led hierarchy. The voice should read as a 100-year-old institution
that happens to have shipped a modern website, not a tech company.

Avoid: bright gradients, decorative icons, marketing-SaaS aesthetics, color
backgrounds on more than one section per page.

## 2. Color Palette & Roles

Two themes. Same token names, different values — swap via `data-theme` on
`<html>`. Always consume semantic tokens, never raw palette.

**Default — Navy + Gold** (`theme-default.css`)

- Navy: `900 #0A1628` · `800 #0d1b2a` · `700 #1e3a5f` · `600 #2c5d8a` · `500 #3d7ab8`
- Gold: `600 #A68520` · `500 #C9A227` · `400 #D4B43A` · `300 #E0C85C`
- Neutral (blue-tinted): `900 #1A1F2A` · `800 #2A3441` · `600 #5A6A7A` · `300 #D1D9E2` · `200 #E8ECF2` · `100 #F5F7FA` · `50 #FAFBFC`

**Alt — Forest + Amber** (`theme-alt.css`, demonstration theme)

- Navy-slot: `900 #0A1A12` · `800 #122B1E` · `700 #1A4A30` · `600 #2A7A4F` · `500 #3AA66A`
- Gold-slot: `600 #B8860B` · `500 #DAA520` · `400 #E8B931` · `300 #F0CA45`

**Semantic aliases** (resolve through CSS vars):

| Role | Token |
|---|---|
| `--color-text-primary` | neutral-900 |
| `--color-text-secondary` / `--color-text-muted` | neutral-600 |
| `--color-text-inverse` | `#ffffff` |
| `--color-background` | `#ffffff` (default) / neutral-50 (alt) |
| `--color-background-alt` | neutral-50 |
| `--color-border` | neutral-200 |
| `--color-link` | navy-600 |
| `--color-link-hover` | navy-700 |
| `--focus-ring-color` | gold-500 |

**Accent (non-themed, small UI):** success `#2e7d4a` on `#e8f5ec`, warning
`#8a6914` on `#fef9e7`, error `#b32b2b` on `#fdeaea`.

## 3. Typography Rules

| Face | Use | Source |
|---|---|---|
| Cormorant Garamond (600–700) | All display type: h1, h2, hero headings | Self-hosted woff2 |
| Inter (400–600) | Body, nav, UI | Self-hosted woff2 |
| SF Mono / system mono | Rare code samples | System stack |

**Scale** (mobile-first, 16px base):
`xs 12` · `sm 14` · `base 16` · `lg 18` · `xl 20` · `2xl 24` · `3xl 30` · `4xl 36` · `5xl 48`

**Line heights:** `tight 1.25` · `snug 1.375` · `normal 1.5` · `relaxed 1.625` · `loose 1.75`.
Body copy uses `relaxed`; display uses `tight` or `1.15` inline on h1.

**Weights:** `400 normal` · `500 medium` · `600 semibold` · `700 bold`.

## 4. Component Stylings

Authoring surface is a Sanity section builder. Section blocks (in
`apps/web/src/components/sections/`):

- `heroSection` — full-bleed banner: image + eyebrow + heading + subtitle + CTAs. Top-of-page.
- `textWithImage` — two-column editorial. `layout: standard` (equal split, 4:3 image via `--aspect-split`) or `layout: portrait` (fixed image column + text column, grid-based — use for bios with portrait photos).
- `cardGrid` — heading + N cards of `{title, description}`. Wraps responsively.
- `ctaBanner` — full-bleed CTA: heading + subtitle + CTAs. `variant: navy | gold`.
- `richText` — Portable Text: h2/h3, paragraphs, bullets, quotes, inline links.
- `statsRow` — number + label pairs.
- `testimonialBlock` — pull quote + attribution.
- `accordionSection` — FAQ / collapsible list.
- `upcomingEvents` — auto from `event` docs.

Shared components: `BaseLayout` (page chrome), `PageHero` (branded navy page
header for classic layout), `NewsCard`, `PortableText`, `PortableTextImage`.

Dispatch layer: `SectionRenderer.astro` — never bypass it.

Buttons / CTAs are plain `.btn` classes with `--primary`, `--secondary-light`,
`--lg` modifiers; styles live in `global.css`. There is no component library —
keep it that way unless the system grows substantially.

## 5. Layout Principles

- **Max widths:** content `42rem` (~672px, optimal reading), wide `64rem`, full `80rem`.
- **Container padding:** `var(--space-4)` (16px). All hero / section blocks anchor on this.
- **Spacing scale (rem):** 1=.25 · 2=.5 · 3=.75 · 4=1 · 5=1.25 · 6=1.5 · 8=2 · 10=2.5 · 12=3 · 14=3.5 · 16=4 · 20=5 · 24=6.
- **Vertical rhythm:** h2 uses `margin-top: var(--space-10)`, h3 `var(--space-8)`, paragraphs `0 0 var(--space-4)`. Sections anchor on `var(--space-16)` top/bottom at desktop.

## 6. Depth & Elevation

Shadows are subtle — this is not a material/neumorphic system.

- `--shadow-sm` — hairline card edges
- `--shadow-md` — elevated cards (hero cards, featured callouts)
- `--shadow-lg` — modals, dropdowns

Borders use `--color-border` (neutral-200) at `1px`. Radii: `sm .25rem` · `md .375rem` · `lg .5rem`. No `rounded-full` except for avatars.

## 7. Do's and Don'ts

**Do**

- Consume semantic tokens (`var(--color-text-primary)`), not raw palette.
- Use aspect-ratio tokens: `--aspect-hero` (2/1), `--aspect-banner` (5/2), `--aspect-card` (3/2), `--aspect-split` (4/3). Profile shots use `aspect-ratio: 1` directly.
- Use `hotspotToPosition(image.hotspot)` from `apps/web/src/sanity/lib/image.ts:26` for `object-position` on any photo of a person.
- Verify at 375, 414, 768, 1280, 1920 before shipping. Take viewport screenshots (not `fullPage`) and visually inspect.
- Reuse existing section blocks. Add a new block only when no composition works.

**Don't**

- **Never crop a person's face or head at any viewport.** Hard rule from editorial review 2026-04-21. If CSS cover cropping would cut the subject, switch layout variant or override `object-position`.
- Don't combine `overflow: hidden` + `align-items: flex-end` + forced `aspect-ratio` on a hero container. This clipped news hero meta rows when titles wrapped. Fixed in commit `7ec6658`.
- Don't use `.width(W).height(H)` on `urlFor()` without `object-position` from hotspot — center-origin CDN crop + center-default CSS crop double-cuts subjects.
- Don't introduce hardcoded hex values in components.
- Don't add Tailwind, UI kits, icon packs, or Storybook without explicit approval — the system is deliberately small.
- Don't add net-new top-level routes without a `ROUTE_MAP` entry in `[...slug].astro`.
- Don't put agent-specific instructions anywhere except this file and `CLAUDE.md`.

## 8. Responsive Behavior

Mobile-first. Breakpoints (min-width): `sm 30rem` · `md 48rem` · `lg 64rem` · `xl 80rem` · `2xl 96rem`.

Test matrix (required before any visual change is declared done):

| Viewport | Use case |
|---|---|
| 375 × 667 | iPhone SE — tightest constraint |
| 414 × 896 | iPhone 11/13/14 — most common mobile |
| 768 × 1024 | iPad portrait — tablet transition |
| 1280 × 800 | Laptop — default desktop |
| 1920 × 1080 | Widescreen — typical monitor |

Touch targets `≥ 44px` on mobile. Body font `≥ 16px`. No horizontal scroll on
any viewport. Typography and padding step down at mobile — e.g., news hero
title uses `font-size-2xl` on mobile and `font-size-4xl` at `48rem+`.

## 9. Agent Prompt Guide

When an external agent (Claude Design, Claude Code, etc.) works in this repo:

1. **Read this file first, then `design-tokens.json`, then `CLAUDE.md`.** This file owns visual intent; `CLAUDE.md` owns engineering/ops context.
2. **Stay within the token scale.** If a design needs a value not in the scale, add the token to `global.css` first and regenerate `design-tokens.json`, rather than hardcoding the value.
3. **Compose before you author.** The section builder blocks above cover most needs. A new section block is a schema change — propose it, don't bypass.
4. **Visual review is non-negotiable.** After any UI change: screenshots at the 5 viewports above, designer-style prose description of what's in each (not pass/fail counts), compare against a known-good reference page.
5. **Respect the content contract.** Content structure is owned by Sanity schemas at `apps/sca-studio/schemaTypes/`. Do not hardcode copy or image URLs in components.
6. **One PR per concern.** Template-level visual fixes (news hero, textWithImage) should ship separately from content changes.
