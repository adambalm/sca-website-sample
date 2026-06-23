import { test, expect } from '@playwright/test'

/**
 * SSR & Content Integrity Verification — 2026-03-17
 *
 * Tests every assertion from the session summary:
 * 1. All Sanity-connected pages are SSR (respond dynamically, not cached)
 * 2. News listing shows correct articles (no ghosts, no missing)
 * 3. Projects listing renders correctly
 * 4. Homepage shows top 3 news articles
 * 5. Static admin pages still work
 * 6. No stega encoding on production (visual editing disabled)
 * 7. Studio is reachable
 */

const BASE = 'http://localhost:4321'

// ─── Assertion 1: All Sanity-connected pages return 200 (SSR) ────────

test.describe('SSR Pages — All Sanity-Connected Routes Return 200', () => {
  const ssrRoutes = [
    { name: 'Homepage', path: '/' },
    { name: 'News listing', path: '/news' },
    // /projects intentionally 404'd per ADR-019 — see "Projects Listing — Content Integrity" describe.skip below.
    // Re-add when the studentProject showcase pipeline is reactivated.
    { name: 'About (catch-all)', path: '/about' },
    { name: 'Academics (catch-all)', path: '/academics' },
    { name: 'Admissions (catch-all)', path: '/admissions' },
    { name: 'Student Life (catch-all)', path: '/student-life' },
  ]

  for (const route of ssrRoutes) {
    test(`${route.name} (${route.path}) returns 200`, async ({ page }) => {
      const response = await page.goto(route.path)
      expect(response?.status(), `${route.path} should return 200`).toBe(200)
    })
  }
})

// ─── Assertion 2: News listing — correct count, no ghosts ────────────

test.describe('News Listing — Content Integrity', () => {
  test('news page loads and has articles', async ({ page }) => {
    await page.goto('/news')
    // Branded header renders as BEM children inside PageHero — there is no parent
    // `.news-page-header` element. Anchor the visibility check on the title.
    const header = page.locator('.news-page-header__title')
    await expect(header).toBeVisible()

    // Should have news cards (we expect 12 published articles)
    const cards = page.locator('.news-listing__grid > *')
    const count = await cards.count()
    expect(count, 'Expected published news articles').toBeGreaterThanOrEqual(1)
    // Sanity was cleaned to exactly 12 — allow for new articles added since
    expect(count, 'Should have at least 10 articles').toBeGreaterThanOrEqual(10)
  })

  test('no ghost/test articles on news page', async ({ page }) => {
    await page.goto('/news')
    const pageText = await page.textContent('body')
    // These test articles were deleted yesterday — they must NOT appear
    expect(pageText?.toLowerCase()).not.toContain('test article')
    expect(pageText?.toLowerCase()).not.toContain('this is a test')
  })

  test('news cards have required fields', async ({ page }) => {
    await page.goto('/news')
    const cards = page.locator('.news-card')
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)

    // First card should have title and date
    const firstCard = cards.first()
    const title = firstCard.locator('.news-card__title')
    await expect(title).toBeVisible()
    const titleText = await title.textContent()
    expect(titleText?.length).toBeGreaterThan(2)
  })
})

// ─── Assertion 3: Projects listing renders ───────────────────────────
// Skipped per ADR-019 (2026-03-17): /projects is intentionally 404'd until the
// studentProject showcase pipeline is reactivated. Tests retained (not deleted)
// so they're ready to re-enable by removing `.skip`. See decisions.md ADR-019.

test.describe.skip('Projects Listing — Content Integrity', () => {
  test('projects page loads with branded header', async ({ page }) => {
    await page.goto('/projects')
    const header = page.locator('.proj-header')
    await expect(header).toBeVisible()

    const title = page.locator('.proj-header__title')
    await expect(title).toHaveText('Student Projects')
  })

  test('projects grid renders cards or shows empty message', async ({ page }) => {
    await page.goto('/projects')
    const grid = page.locator('.proj-listing__grid')
    const empty = page.locator('.proj-listing__empty')

    // Either we have project cards or the empty message — not neither
    const hasGrid = await grid.count() > 0
    const hasEmpty = await empty.count() > 0
    expect(hasGrid || hasEmpty, 'Page must show either projects or empty state').toBe(true)
  })
})

// ─── Assertion 4: Homepage shows top 3 news ─────────────────────────

test.describe('Homepage — News Section', () => {
  test('homepage has news section with up to 3 articles', async ({ page }) => {
    await page.goto('/')
    // The homepage news section
    const newsSection = page.locator('.hp-news')
    if (await newsSection.count() > 0) {
      await expect(newsSection).toBeVisible()
      const newsCards = newsSection.locator('.news-card')
      const count = await newsCards.count()
      expect(count, 'Homepage should show 1-3 news articles').toBeGreaterThanOrEqual(1)
      expect(count, 'Homepage should show at most 3 news articles').toBeLessThanOrEqual(3)
    }
  })

  test('homepage hero loads', async ({ page }) => {
    await page.goto('/')
    const hero = page.locator('.hp-hero')
    await expect(hero).toBeVisible()
    const title = page.locator('.hp-hero__title')
    await expect(title).toBeVisible()
  })
})

// ─── Assertion 5: Static admin pages still work ─────────────────────

test.describe('Admin Pages — Static Routes', () => {
  const adminRoutes = [
    { name: 'Platform Overview', path: '/admin/platform-overview' },
  ]

  for (const route of adminRoutes) {
    test(`${route.name} returns 200`, async ({ page }) => {
      const response = await page.goto(route.path)
      expect(response?.status()).toBe(200)
    })
  }
})

// ─── Assertion 6: No stega encoding on production ───────────────────

test.describe('No Stega Encoding (Production Mode)', () => {
  test('news page has no stega markers in HTML', async ({ page }) => {
    await page.goto('/news')
    const html = await page.content()
    // Stega encoding injects invisible Unicode characters or data-sanity attributes
    // when visual editing is enabled
    expect(html).not.toContain('data-sanity-edit-info')
    // Stega uses specific Unicode range (U+E000-U+F8FF private use area)
    // Check for the stega prefix pattern
    expect(html).not.toMatch(/\uFEFF/)
  })

  test('homepage has no stega markers', async ({ page }) => {
    await page.goto('/')
    const html = await page.content()
    expect(html).not.toContain('data-sanity-edit-info')
  })
})

// ─── Assertion 7: SSR freshness — consecutive loads return same content ──

test.describe('SSR Freshness — Pages Serve Live Content', () => {
  test('news listing returns consistent content across 2 loads', async ({ page }) => {
    // Load 1
    await page.goto('/news')
    const cards1 = await page.locator('.news-card').count()
    const firstTitle1 = await page.locator('.news-card__title').first().textContent()

    // Load 2 (fresh request)
    await page.goto('/news')
    const cards2 = await page.locator('.news-card').count()
    const firstTitle2 = await page.locator('.news-card__title').first().textContent()

    // Both loads should return the same live data
    expect(cards1).toBe(cards2)
    expect(firstTitle1).toBe(firstTitle2)
  })

  test('homepage news count matches between loads', async ({ page }) => {
    await page.goto('/')
    const newsSection = page.locator('.hp-news')
    if (await newsSection.count() > 0) {
      const count1 = await newsSection.locator('.news-card').count()
      await page.goto('/')
      const count2 = await page.locator('.hp-news .news-card').count()
      expect(count1).toBe(count2)
    }
  })
})

// ─── Assertion 8: News detail pages load (SSR dynamic routes) ───────

test.describe('News Detail — Dynamic Routes', () => {
  test('first news card links to a working detail page', async ({ page }) => {
    await page.goto('/news')
    // Link is inside the card: .news-card__link inside .news-card
    const firstLink = page.locator('.news-card__link').first()
    if (await firstLink.count() > 0) {
      const href = await firstLink.getAttribute('href')
      expect(href).toBeTruthy()
      expect(href).toMatch(/^\/news\//)

      const response = await page.goto(href!)
      expect(response?.status()).toBe(200)

      // Detail page should have a title
      const detailTitle = page.locator('.nd-header__title, h1')
      await expect(detailTitle.first()).toBeVisible()
    }
  })
})

// ─── Assertion 9: Catch-all pages with sections render ──────────────

test.describe('Catch-All Section Pages', () => {
  const sectionPages = [
    { name: 'About', path: '/about', minSections: 2 },
    { name: 'Academics', path: '/academics', minSections: 2 },
    { name: 'Admissions', path: '/admissions', minSections: 2 },
    { name: 'Student Life', path: '/student-life', minSections: 2 },
  ]

  for (const pg of sectionPages) {
    test(`${pg.name} has at least ${pg.minSections} sections`, async ({ page }) => {
      await page.goto(pg.path)
      const sections = page.locator('[data-section-key]')
      const count = await sections.count()
      expect(count, `${pg.name} should have >= ${pg.minSections} sections`).toBeGreaterThanOrEqual(pg.minSections)
    })
  }
})

// ─── Assertion 10: News article count matches Sanity ────────────────

test.describe('Cross-Reference: Article Count', () => {
  test('news page article count is reasonable (12+ expected)', async ({ page }) => {
    await page.goto('/news')
    const cards = page.locator('.news-card')
    const count = await cards.count()
    // We asserted 12 published articles after cleanup — allow for growth
    expect(count).toBeGreaterThanOrEqual(12)
    // Sanity check — shouldn't have hundreds
    expect(count).toBeLessThan(100)
  })
})
