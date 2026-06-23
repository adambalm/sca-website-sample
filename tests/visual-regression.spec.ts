import { test, expect } from '@playwright/test'

/**
 * Visual regression tests — captures full-page screenshots of key routes
 * at desktop and mobile viewports (handled by Playwright projects).
 *
 * Run: npx playwright test tests/visual-regression.spec.ts
 * Update snapshots: npx playwright test tests/visual-regression.spec.ts --update-snapshots
 */

const routes = [
  { name: 'homepage', path: '/' },
  { name: 'about', path: '/about' },
  { name: 'academics', path: '/academics' },
  { name: 'athletics', path: '/athletics' },
  { name: 'admissions', path: '/admissions' },
  { name: 'student-life', path: '/student-life' },
  { name: 'news', path: '/news' },
  { name: 'contact', path: '/contact' },
  // /projects intentionally 404'd per ADR-019 — exclude from visual regression.
]

for (const route of routes) {
  test(`visual: ${route.name} page`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'networkidle' })
    await expect(page).toHaveScreenshot(`${route.name}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    })
  })
}
