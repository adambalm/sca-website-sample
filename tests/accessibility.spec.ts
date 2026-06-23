import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Accessibility audit — runs axe-core (WCAG 2.1 AA) against every
 * published route on both desktop and mobile viewports.
 *
 * axe-core is the industry-standard engine used by Deque, Microsoft,
 * Google, and gov agencies. It checks ~90 WCAG rules automatically.
 *
 * Run: npx playwright test tests/accessibility.spec.ts
 */

// ─── All Published Routes ───────────────────────────────────────────

const ALL_ROUTES = [
  { name: 'Homepage', path: '/' },
  { name: 'About', path: '/about' },
  { name: 'Academics', path: '/academics' },
  { name: 'Admissions', path: '/admissions' },
  { name: 'Student Life', path: '/student-life' },
  { name: 'History', path: '/about/history' },
  { name: 'Vision & Mission', path: '/about/vision' },
  { name: 'Guardian Alliance', path: '/about/guardian-alliance' },
  { name: 'Engagement', path: '/engagement' },
  { name: 'Signature Courses', path: '/academics/signature' },
  { name: 'Special Programs', path: '/academics/special' },
  { name: 'Future Study', path: '/academics/future-study' },
  { name: 'Athletic Philosophy', path: '/athletics/philosophy' },
  { name: 'NCAA Pathway', path: '/athletics/ncaa-pathway' },
  { name: 'News', path: '/news' },
  // /projects intentionally 404'd per ADR-019 — out of scope until showcase reactivation.
]

// ─── WCAG 2.1 AA Audit ─────────────────────────────────────────────

test.describe('Accessibility (WCAG 2.1 AA)', () => {
  for (const route of ALL_ROUTES) {
    test(`${route.name} (${route.path}) passes axe audit`, async ({ page }) => {
      await page.goto(route.path)
      // Wait for content to render (SSR pages may have async data)
      await page.waitForLoadState('networkidle')

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()

      // Build a readable failure message listing each violation
      const violations = results.violations.map(v => {
        const nodes = v.nodes.map(n => `    ${n.html.slice(0, 120)}`).join('\n')
        return `[${v.impact}] ${v.id}: ${v.help}\n  ${v.helpUrl}\n${nodes}`
      })

      expect(
        results.violations,
        `${route.name} has ${results.violations.length} accessibility violation(s):\n\n${violations.join('\n\n')}`
      ).toHaveLength(0)
    })
  }
})
