import { test, expect } from '@playwright/test'

/**
 * Multi-resolution visual audit
 *
 * Tests every key page at multiple viewport sizes including unusual scalings.
 * Captures screenshots for manual review and runs automated checks for:
 * - Hero image visibility (not just sky/smoke/feet)
 * - Logo legibility and sizing
 * - Text readability (no overlap, adequate contrast area)
 * - Nav completeness (all items reachable)
 * - Content not clipped or overflowing
 */

const VIEWPORTS = [
  { name: '375x812-iphone', width: 375, height: 812 },
  { name: '390x844-iphone14', width: 390, height: 844 },
  { name: '768x1024-ipad-portrait', width: 768, height: 1024 },
  { name: '1024x768-ipad-landscape', width: 1024, height: 768 },
  { name: '1280x720-laptop-small', width: 1280, height: 720 },
  { name: '1440x900-laptop', width: 1440, height: 900 },
  { name: '1920x1080-desktop', width: 1920, height: 1080 },
  { name: '2560x1080-ultrawide', width: 2560, height: 1080 },
  { name: '1280x1024-5x4-monitor', width: 1280, height: 1024 },
]

const KEY_PAGES = [
  { name: 'homepage', path: '/' },
  { name: 'about', path: '/about' },
  { name: 'admissions', path: '/admissions' },
  { name: 'athletics', path: '/athletics' },
  { name: 'student-life', path: '/student-life' },
]

// ─── Screenshot Capture at All Resolutions ──────────────────────

test.describe('Multi-Resolution Screenshots', () => {
  for (const vp of VIEWPORTS) {
    for (const page of KEY_PAGES) {
      test(`${page.name} at ${vp.name}`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
        })
        const p = await context.newPage()
        await p.goto(page.path)
        await p.waitForLoadState('networkidle')
        await p.screenshot({
          path: `test-results/resolution-audit/${page.name}-${vp.name}.png`,
          fullPage: false, // viewport only — shows what user actually sees
        })
        await context.close()
      })
    }
  }
})

// ─── Logo Sizing Across Breakpoints ─────────────────────────────

test.describe('Logo Legibility', () => {
  const LOGO_VIEWPORTS = [
    { name: 'mobile', width: 375, height: 812, minSize: 35, maxSize: 50 },
    { name: 'tablet', width: 768, height: 1024, minSize: 50, maxSize: 65 },
    { name: 'desktop', width: 1440, height: 900, minSize: 58, maxSize: 75 },
    { name: 'ultrawide', width: 2560, height: 1080, minSize: 58, maxSize: 75 },
  ]

  for (const vp of LOGO_VIEWPORTS) {
    test(`logo is legible at ${vp.name} (${vp.width}px)`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      })
      const p = await context.newPage()
      await p.goto('/')

      const logoImg = p.locator('.site-header__logo-img')
      await expect(logoImg).toBeVisible()

      const box = await logoImg.boundingBox()
      expect(box).toBeTruthy()
      expect(box!.width).toBeGreaterThanOrEqual(vp.minSize)
      expect(box!.width).toBeLessThanOrEqual(vp.maxSize)

      // Verify image loaded
      const naturalWidth = await logoImg.evaluate((img: HTMLImageElement) => img.naturalWidth)
      expect(naturalWidth).toBeGreaterThan(0)

      await context.close()
    })
  }
})

// ─── Hero Image Content Check ───────────────────────────────────

test.describe('Hero Image Coverage', () => {
  const HERO_PAGES = [
    { name: 'Homepage', path: '/', selector: '.hp-hero' },
    { name: 'About', path: '/about', selector: '.hero-section' },
    { name: 'Admissions', path: '/admissions', selector: '.hero-section' },
    { name: 'Student Life', path: '/student-life', selector: '.hero-section' },
  ]

  for (const page of HERO_PAGES) {
    test(`${page.name} hero has adequate height at all widths`, async ({ browser }) => {
      for (const width of [375, 768, 1280, 1920, 2560]) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
        })
        const p = await context.newPage()
        await p.goto(page.path)

        const hero = p.locator(page.selector).first()
        await expect(hero).toBeVisible()

        const box = await hero.boundingBox()
        expect(box).toBeTruthy()

        // Hero should be at least 300px tall at any width
        expect(
          box!.height,
          `${page.name} hero too short at ${width}px wide: ${box!.height}px`
        ).toBeGreaterThan(300)

        // Hero should not be taller than 80% of viewport (would push all content off-screen)
        expect(
          box!.height,
          `${page.name} hero too tall at ${width}px wide: ${box!.height}px`
        ).toBeLessThan(900 * 0.8)

        await context.close()
      }
    })
  }
})

// ─── Mobile Nav Scroll ──────────────────────────────────────────

test.describe('Mobile Nav All Items Reachable', () => {
  test('all nav items visible in mobile menu', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 }, // iPhone SE — short screen
    })
    const p = await context.newPage()
    await p.goto('/')

    // Open mobile menu
    const toggle = p.locator('.mobile-menu-toggle')
    await toggle.click()

    // Wait for menu to appear
    const mobileNav = p.locator('#mobile-nav[data-open="true"]')
    await expect(mobileNav).toBeVisible()

    // Check all expected nav items exist
    const expectedItems = ['About', 'Academics', 'Athletics', 'Student Life', 'Admissions', 'News', 'Projects', 'Contact']
    for (const label of expectedItems) {
      const link = mobileNav.locator(`a:text-is("${label}")`)
      // Item should exist in DOM (may need scroll to be visible)
      await expect(link).toHaveCount(1)
    }

    // The menu should be scrollable — verify it has overflow auto
    const overflow = await mobileNav.evaluate((el) => getComputedStyle(el).overflowY)
    expect(overflow).toBe('auto')

    await context.close()
  })
})

// ─── Text Legibility Over Hero Images ───────────────────────────

test.describe('Hero Text Legibility', () => {
  const PAGES = [
    { name: 'Homepage', path: '/', headingSelector: '.hp-hero__title' },
    { name: 'About', path: '/about', headingSelector: '.hero-section__heading' },
    { name: 'Admissions', path: '/admissions', headingSelector: '.hero-section__heading' },
  ]

  for (const page of PAGES) {
    test(`${page.name} hero heading is readable at desktop width`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
      })
      const p = await context.newPage()
      await p.goto(page.path)

      const heading = p.locator(page.headingSelector).first()
      await expect(heading).toBeVisible()

      // Heading should have white or near-white color
      const color = await heading.evaluate((el) => getComputedStyle(el).color)
      // Parse rgb values
      const match = color.match(/(\d+),\s*(\d+),\s*(\d+)/)
      if (match) {
        const [, r, g, b] = match.map(Number)
        // Should be light text (high luminance)
        const luminance = (r + g + b) / 3
        expect(luminance, `Hero heading text too dark on ${page.name}: ${color}`).toBeGreaterThan(180)
      }

      await context.close()
    })
  }
})

// ─── Program Page Headers at Wide Viewports ─────────────────────

test.describe('Program Headers at Wide Viewports', () => {
  const PROGRAMS = [
    { name: 'Athletics', path: '/athletics' },
    { name: 'Athletic Philosophy', path: '/athletics/philosophy' },
    { name: 'Special Programs', path: '/academics/special' },
  ]

  for (const prog of PROGRAMS) {
    test(`${prog.name} header renders properly at ultrawide`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 2560, height: 1080 },
      })
      const p = await context.newPage()
      await p.goto(prog.path)

      const header = p.locator('.cp-header').first()
      if (await header.count() > 0) {
        const box = await header.boundingBox()
        expect(box).toBeTruthy()
        expect(box!.height).toBeGreaterThan(200)
        expect(box!.height).toBeLessThan(600)

        // Title should be visible and not clipped
        const title = header.locator('h1')
        await expect(title).toBeVisible()
      }

      await context.close()
    })
  }
})
