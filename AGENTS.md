<!--
AGENT-FACING — humans can skip this file.
Human readers: see README.md for the project overview. This file is a behavioral
spec for AI agents working in the repository (read-only GAM rules, evidence-before-
assertion, doc-freshness mandate). It doesn't describe the product or codebase.
-->

# AGENTS.md — Agent Discipline Specification

**Created:** 2026-02-04
**Purpose:** Operational guardrails for AI agents working in this repository
**ADR:** When making architectural or operational decisions, append an entry to `decisions.md`.

---

## 1. Deployment Authorization Rules

- **Production deployments require explicit operator approval**
- CLI deployments (`vercel --prod`) should be preceded by local build verification
- Git-triggered deployments require branch protection review
- Never deploy untested adapter changes

---

## 2. GAM Read-Only Rule

**ABSOLUTE CONSTRAINT:**

> GAM is READ-ONLY unless operator explicitly authorizes write operations.

**Permitted:**
- `gam info domain` — Verify authentication
- `gam print teamdrives` — List shared drives
- `gam print filelist` — Query existing folders
- `gam oauth info` — Inspect current scopes

**Prohibited (without explicit authorization):**
- `gam create drivefile` — Create folders
- `gam add drivefileacl` — Modify permissions
- `gam user ... create` — Create users
- `gam oauth create` — Regenerate tokens
- Any command that modifies Google Workspace state

**Violation classification:** INSTITUTIONAL-RISK LEVEL

---

## 3. Evidence-Before-Assertion Rule

Never claim:
- "The system is running" without process listing evidence
- "The deployment succeeded" without HTTP status verification
- "The feature works" without runtime test evidence

**Classification model:**
| Tier | Name | Evidence Required |
|------|------|-------------------|
| DESIGN | Code exists | File inspection |
| IMPLEMENTED | Runtime verified | Logs, API responses, curl output |
| OPERATIONAL | Production authorized | Process listings, live URLs |

---

## 4. Human Verification Escalation Rule

When verification is ambiguous, **pause and request:**
- Operator screenshot for UI state
- Manual confirmation for console errors
- Explicit approval before destructive operations

Never assume UI success from HTTP 200 alone.

---

## 5. Context Compaction Survival Guidance

Future Claude instances may begin naive. Ensure:

1. **CLAUDE.md** contains deployment state summary
2. **STATUS.md** reflects current phase
3. Critical constraints are documented in-repo (not just in conversation)

**Survival capsule format:**
```
Component: [name]
Classification: DESIGN | IMPLEMENTED | OPERATIONAL
Evidence: [brief description]
Last verified: [date]
```

---

## 6. Cross-Project Guardrails

Shared rules across all SCA repos are documented in `sca-internal/AGENTS.md`. This file covers sca-website-specific rules only.

**Note:** No enforcement mechanism exists to keep per-repo and cross-project rules in sync. The operator is responsible for consistency.

---

## 7. Doc-Freshness Rule (ADR-018)

Every commit that changes pages, schemas, config, or infrastructure **MUST** update the affected doc section and bump "Last Updated" / "Last Verified" dates.

**Affected docs:** `README.md`, `STATUS.md`, `CLAUDE.md`, `decisions.md`, `AGENTS.md`

**Why:** Forensic audit on 2026-03-17 found all 6 docs were stale, with three places incorrectly claiming "navigation is hardcoded" when it had been CMS-driven since 2026-03-13.

**Violation classification:** DOCUMENTATION-DEBT LEVEL — will compound rapidly with multi-agent workflows.

---

## Current Architecture State (2026-05-07)

| Component | Classification | Evidence |
|-----------|---------------|----------|
| sca-website Production (Vercel, Git-backed) | OPERATIONAL | Auto-deploys on push to master. ISR caching (300s). Verified 2026-03-30. |
| sca-website Preview (Vercel, `preview` branch) | OPERATIONAL | Visual editing enabled (stega + previewDrafts). Verified 2026-03-30. |
| Sanity Studio | OPERATIONAL | Redeployed 2026-03-30. Presentation tool points to preview branch URL. Pending redeploy for ADR-026, ADR-027, and ADR-030 schema changes. |
| CMS-Driven Navigation | OPERATIONAL | Sanity nav documents + BaseLayout rendering |
| Section-Based Page Builder | IMPLEMENTED | 11 block types (added `videoEmbed` 2026-05-06, ADR-027), SectionRenderer dispatching |
| Homepage CMS-First Toggle | IMPLEMENTED | `useSections` flag + `sections[]` on `homepageConfig` (default OFF). Verified 2026-05-04, ADR-026. Pending Studio redeploy. |
| Block Library Reference Page | IMPLEMENTED | `/admin/block-library` (prerendered, `noindex`). Renders all 11 blocks with sample data + dev panels. Added 2026-05-06, ADR-027. URL is not access control. |
| SSR (All Content Pages) | OPERATIONAL | ISR with 5-min edge cache on all SSR routes |

---

*This document is authoritative for agent behavior in sca-website repository.*
