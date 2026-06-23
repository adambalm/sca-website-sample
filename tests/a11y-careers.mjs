// Axe-core accessibility audit on /careers and /careers/[slug]
// Run with: node tests/a11y-careers.mjs
import { chromium } from 'playwright'
import { AxeBuilder } from '@axe-core/playwright'

const TARGET_URL = 'http://localhost:4321'
const ROUTES = ['/careers', '/careers/director-of-college-counseling-and-international-programs']

const browser = await chromium.launch({ headless: true })
let totalViolations = 0

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })

for (const route of ROUTES) {
  const page = await context.newPage()
  await page.goto(`${TARGET_URL}${route}`, { waitUntil: 'networkidle' })

  const results = await new AxeBuilder({ page })
    .exclude('astro-dev-toolbar')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  const violations = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.length,
  }))

  console.log(`\n=== ${route} ===`)
  console.log(`Violations: ${results.violations.length}`)
  if (results.violations.length > 0) {
    console.log(JSON.stringify(violations, null, 2))
    totalViolations += results.violations.length
  }
  console.log(`Passes: ${results.passes.length}`)
  console.log(`Incomplete: ${results.incomplete.length}`)

  await page.close()
}

await browser.close()
process.exit(totalViolations > 0 ? 1 : 0)
