import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:4321'

test.describe('Enrollment URL (Apply Button)', () => {
  test('siteSettings enrollmentUrl renders Apply button in header', async ({ page }) => {
    await page.goto(BASE + '/')

    // Check if Apply button exists in desktop header
    const applyBtn = page.locator('.site-header__apply-btn')
    const mobileApplyBtn = page.locator('.mobile-nav__apply-btn')

    const desktopCount = await applyBtn.count()
    const mobileCount = await mobileApplyBtn.count()

    console.log(`Desktop Apply button count: ${desktopCount}`)
    console.log(`Mobile Apply button count: ${mobileCount}`)

    if (desktopCount > 0) {
      const href = await applyBtn.getAttribute('href')
      console.log(`Desktop Apply href: ${href}`)
      await expect(applyBtn).toHaveAttribute('target', '_blank')
    } else {
      console.log('NO Apply button found — enrollmentUrl may not be set in siteSettings')
    }

    // Check what the header nav contains
    const navLinks = page.locator('.site-header__nav-link')
    const count = await navLinks.count()
    console.log(`\nHeader nav links (${count}):`)
    for (let i = 0; i < count; i++) {
      const text = await navLinks.nth(i).textContent()
      const href = await navLinks.nth(i).getAttribute('href')
      console.log(`  ${i}: "${text?.trim()}" → ${href}`)
    }
  })

  test('enrollmentUrl is present in siteSettings API response', async ({ page }) => {
    // Fetch the page and check if the raw HTML contains enrollmentUrl-related markup
    const response = await page.goto(BASE + '/')
    const html = await response?.text() || ''

    const hasApplyBtn = html.includes('site-header__apply-btn')
    const hasEnrollmentUrl = html.includes('enrollmentUrl') || html.includes('apply-btn')

    console.log(`HTML contains apply-btn class: ${hasApplyBtn}`)
    console.log(`HTML contains enrollment reference: ${hasEnrollmentUrl}`)

    // Check for the specific enrollment URL pattern
    const applyMatch = html.match(/site-header__apply-btn[^>]*href="([^"]*)"/)
    if (applyMatch) {
      console.log(`Apply button href in HTML: ${applyMatch[1]}`)
    }
  })

  test('Apply button visible on multiple pages', async ({ page }) => {
    const pages = ['/', '/about', '/admissions', '/news']
    for (const path of pages) {
      await page.goto(BASE + path)
      const btn = page.locator('.site-header__apply-btn')
      const count = await btn.count()
      console.log(`${path}: Apply button ${count > 0 ? 'PRESENT' : 'MISSING'}`)
    }
  })
})

test.describe('Stega / Visual Editing Links', () => {
  test('check for stega-encoded content on homepage', async ({ page }) => {
    await page.goto(BASE + '/')
    const html = await page.content()

    // Stega encoding uses invisible Unicode characters
    const hasStega = html.includes('\u200B') || html.includes('\\u200B') ||
                     html.includes('\uFEFF') || html.includes('data-sanity')
    console.log(`Stega encoding detected: ${hasStega}`)

    // Check for visual editing component
    const veScript = page.locator('script[src*="visual-editing"]')
    const veCount = await veScript.count()
    console.log(`Visual editing scripts: ${veCount}`)

    // Check for any sanity-related data attributes
    const sanityAttrs = await page.evaluate(() => {
      const els = document.querySelectorAll('[data-sanity]')
      return els.length
    })
    console.log(`Elements with data-sanity: ${sanityAttrs}`)

    // Check visual editing env var
    const hasVEEnabled = html.includes('visual-editing') || html.includes('VisualEditing')
    console.log(`Visual editing reference in HTML: ${hasVEEnabled}`)
  })

  test('check PUBLIC_SANITY_VISUAL_EDITING_ENABLED on local dev', async ({ page }) => {
    await page.goto(BASE + '/')

    // Look for the visual editing component/island
    const astroIslands = page.locator('astro-island')
    const islandCount = await astroIslands.count()
    console.log(`Astro islands found: ${islandCount}`)

    for (let i = 0; i < islandCount; i++) {
      const name = await astroIslands.nth(i).getAttribute('component-url')
      console.log(`  Island ${i}: ${name}`)
    }
  })

  test('stega links present in text content', async ({ page }) => {
    await page.goto(BASE + '/about')
    const html = await page.content()

    // Check for zero-width characters that indicate stega encoding
    // Stega uses sequences of \u200B (zero-width space) and \u200C (zero-width non-joiner)
    const zwsCount = (html.match(/\u200B/g) || []).length
    const zwnjCount = (html.match(/\u200C/g) || []).length

    console.log(`Zero-width spaces (stega markers): ${zwsCount}`)
    console.log(`Zero-width non-joiners (stega markers): ${zwnjCount}`)

    if (zwsCount > 0 || zwnjCount > 0) {
      console.log('✓ Stega encoding IS active — "Open in Studio" links should work')
    } else {
      console.log('✗ No stega encoding detected — visual editing links will NOT work')
    }
  })

  test('check deployed site for stega comparison', async ({ page }) => {
    await page.goto('https://web-beta-lilac-27.vercel.app/about')
    const html = await page.content()

    const zwsCount = (html.match(/\u200B/g) || []).length
    const zwnjCount = (html.match(/\u200C/g) || []).length

    console.log(`[DEPLOYED] Zero-width spaces: ${zwsCount}`)
    console.log(`[DEPLOYED] Zero-width non-joiners: ${zwnjCount}`)

    if (zwsCount > 0 || zwnjCount > 0) {
      console.log('✓ Deployed site HAS stega encoding')
    } else {
      console.log('✗ Deployed site has NO stega encoding')
    }
  })
})
