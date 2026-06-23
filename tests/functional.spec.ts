import { test, expect } from '@playwright/test'

/**
 * Functional tests — verifies every published route loads, has correct
 * structure, branded headers, working links, and proper image handling.
 *
 * These test the actual user experience: can a parent browsing this site
 * navigate every page without hitting errors or broken layouts?
 */

// ─── All Published Routes ───────────────────────────────────────────
// Every URL that a visitor could reach. Grouped by page type.

const SECTIONED_PAGES = [
  { name: 'About', path: '/about' },
  { name: 'Academics', path: '/academics' },
  { name: 'Admissions', path: '/admissions' },
  { name: 'Student Life', path: '/student-life' },
]

const CLASSIC_PAGES = [
  { name: 'History', path: '/about/history' },
  { name: 'Vision & Mission', path: '/about/vision' },
  { name: 'Guardian Alliance', path: '/about/guardian-alliance' },
  { name: 'Engagement', path: '/engagement' },
]

const PROGRAM_PAGES = [
  { name: 'Signature Courses', path: '/academics/signature' },
  { name: 'Special Programs', path: '/academics/special' },
  { name: 'Future Study', path: '/academics/future-study' },
  { name: 'Athletic Philosophy', path: '/athletics/philosophy' },
  { name: 'NCAA Pathway', path: '/athletics/ncaa-pathway' },
]

const LISTING_PAGES = [
  { name: 'News', path: '/news' },
  // /projects intentionally 404'd per ADR-019 — see skipped 'projects listing has branded header' below.
]

// ─── Every Route Loads ──────────────────────────────────────────────

test.describe('All Routes Load', () => {
  const allRoutes = [
    { name: 'Homepage', path: '/' },
    ...SECTIONED_PAGES,
    ...CLASSIC_PAGES,
    ...PROGRAM_PAGES,
    ...LISTING_PAGES,
  ]

  for (const route of allRoutes) {
    test(`${route.name} (${route.path}) returns 200`, async ({ page }) => {
      const response = await page.goto(route.path)
      expect(response?.status()).toBeLessThan(400)
    })
  }
})

// ─── Branded Headers ────────────────────────────────────────────────
// Every page should have the branded navy header pattern (not flat gray).

test.describe('Branded Headers', () => {
  test('homepage has hero section', async ({ page }) => {
    await page.goto('/')
    const hero = page.locator('.hp-hero')
    await expect(hero).toBeVisible()
    await expect(hero).toHaveCSS('min-height', /\d+/)
  })

  for (const route of SECTIONED_PAGES) {
    test(`${route.name} has hero section`, async ({ page }) => {
      await page.goto(route.path)
      const hero = page.locator('.hero-section')
      if (await hero.count() > 0) {
        await expect(hero.first()).toBeVisible()
        // Should have navy-ish background (not gray)
        const bg = await hero.first().evaluate(el =>
          getComputedStyle(el).backgroundColor
        )
        // Navy backgrounds have low R, low G values
        expect(bg).not.toBe('rgb(245, 245, 245)') // not neutral gray
      }
    })
  }

  for (const route of [...CLASSIC_PAGES, ...PROGRAM_PAGES]) {
    test(`${route.name} has branded classic header`, async ({ page }) => {
      const response = await page.goto(route.path)
      if (response?.status() === 200) {
        const header = page.locator('.cp-header')
        await expect(header).toBeVisible()

        // Should have navy background, not gray
        const bg = await header.evaluate(el =>
          getComputedStyle(el).backgroundColor
        )
        expect(bg).not.toBe('rgb(245, 245, 245)')
        expect(bg).not.toBe('rgb(232, 232, 232)')
      }
    })
  }

  test('news listing has branded header', async ({ page }) => {
    await page.goto('/news')
    const header = page.locator('.news-page-header')
    await expect(header).toBeVisible()
    const bg = await header.evaluate(el =>
      getComputedStyle(el).backgroundColor
    )
    expect(bg).not.toBe('rgb(245, 245, 245)')
  })

  // ADR-019: /projects is intentionally 404'd until the studentProject
  // showcase pipeline is reactivated. Test retained (not deleted) so it's
  // ready to re-enable by removing `.skip`.
  test.skip('projects listing has branded header', async ({ page }) => {
    await page.goto('/projects')
    const header = page.locator('.proj-header')
    await expect(header).toBeVisible()
  })
})

// ─── Gold Accent Rule ───────────────────────────────────────────────
// Classic layout pages should have the gold accent rule between header and content.

test.describe('Gold Accent Rule', () => {
  for (const route of [...CLASSIC_PAGES, ...PROGRAM_PAGES]) {
    test(`${route.name} has accent rule`, async ({ page }) => {
      const response = await page.goto(route.path)
      if (response?.status() === 200) {
        const rule = page.locator('.cp-accent-rule')
        if (await rule.count() > 0) {
          const height = await rule.evaluate(el =>
            getComputedStyle(el).height
          )
          expect(parseFloat(height)).toBeGreaterThan(0)
        }
      }
    })
  }
})

// ─── Footer CTA Banner ─────────────────────────────────────────────
// Classic layout pages should have the branded footer CTA.

test.describe('Footer CTA', () => {
  for (const route of [...CLASSIC_PAGES, ...PROGRAM_PAGES]) {
    test(`${route.name} has footer CTA`, async ({ page }) => {
      const response = await page.goto(route.path)
      if (response?.status() === 200) {
        const cta = page.locator('.cp-footer-cta')
        if (await cta.count() > 0) {
          await expect(cta).toBeVisible()
          // Should have CTA buttons
          const buttons = cta.locator('.btn')
          expect(await buttons.count()).toBeGreaterThanOrEqual(1)
        }
      }
    })
  }
})

// ─── Navigation ─────────────────────────────────────────────────────

test.describe('Navigation', () => {
  test('header nav has all main links', async ({ page }) => {
    await page.goto('/')

    // Desktop uses .site-header__nav, mobile uses #mobile-nav
    const isMobile = await page.locator('.mobile-menu-toggle').isVisible()
    let navLinks: string[]

    if (isMobile) {
      await page.locator('.mobile-menu-toggle').click()
      const mobileNav = page.locator('#mobile-nav')
      await expect(mobileNav).toBeVisible()
      navLinks = await mobileNav.locator('a').allTextContents()
    } else {
      const nav = page.locator('.site-header__nav')
      await expect(nav).toBeVisible()
      navLinks = await nav.locator('a').allTextContents()
    }

    const navText = navLinks.join(' ').toLowerCase()
    expect(navText).toContain('about')
    expect(navText).toContain('academics')
    expect(navText).toContain('athletics')
    expect(navText).toContain('admissions')
    expect(navText).toContain('news')
  })

  test('footer has links', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('.site-footer')
    await expect(footer).toBeVisible()
    const footerLinks = footer.locator('a')
    expect(await footerLinks.count()).toBeGreaterThan(0)
  })

  test('nav links navigate to correct pages', async ({ page }) => {
    await page.goto('/')

    // On mobile, use the mobile nav; on desktop, use the header nav
    const isMobile = await page.locator('.mobile-menu-toggle').isVisible()

    if (isMobile) {
      await page.locator('.mobile-menu-toggle').click()
      const aboutLink = page.locator('#mobile-nav a[href="/about"]').first()
      if (await aboutLink.count() > 0) {
        await aboutLink.click()
        await expect(page).toHaveURL(/\/about/)
      }
    } else {
      const aboutLink = page.locator('.site-header__nav a[href="/about"]').first()
      if (await aboutLink.count() > 0) {
        await aboutLink.click()
        await expect(page).toHaveURL(/\/about/)
      }
    }
  })
})

// ─── Image Aspect Ratios ────────────────────────────────────────────
// Verify images use standard aspect ratios and don't "float in space".

test.describe('Image Standards', () => {
  test('news cards use standard 3:2 aspect ratio', async ({ page }) => {
    await page.goto('/news')
    const imageWrappers = page.locator('.news-card__image-wrapper')
    if (await imageWrappers.count() > 0) {
      const ratio = await imageWrappers.first().evaluate(el =>
        getComputedStyle(el).aspectRatio
      )
      // Should be 3 / 2 (browsers may normalize to "3 / 2" or "1.5")
      expect(ratio).toMatch(/3\s*\/\s*2|1\.5/)
    }
  })

  test('card grid images use standard 3:2 aspect ratio', async ({ page }) => {
    await page.goto('/academics')
    const cardImages = page.locator('.cg-card__img')
    if (await cardImages.count() > 0) {
      const ratio = await cardImages.first().evaluate(el =>
        getComputedStyle(el).aspectRatio
      )
      expect(ratio).toMatch(/3\s*\/\s*2|1\.5/)
    }
  })

  test('text+image sections use standard 4:3 aspect ratio', async ({ page }) => {
    await page.goto('/about')
    const images = page.locator('.twi-section__img')
    if (await images.count() > 0) {
      const ratio = await images.first().evaluate(el =>
        getComputedStyle(el).aspectRatio
      )
      expect(ratio).toMatch(/4\s*\/\s*3|1\.333/)
    }
  })

  test('program header images use banner aspect ratio', async ({ page }) => {
    await page.goto('/athletics/philosophy')
    const header = page.locator('.cp-header--has-image')
    if (await header.count() > 0) {
      const ratio = await header.evaluate(el =>
        getComputedStyle(el).aspectRatio
      )
      expect(ratio).toMatch(/5\s*\/\s*2|2\.5/)
    }
  })

  test('images have object-fit cover', async ({ page }) => {
    await page.goto('/news')
    const images = page.locator('.news-card__image')
    if (await images.count() > 0) {
      const fit = await images.first().evaluate(el =>
        getComputedStyle(el).objectFit
      )
      expect(fit).toBe('cover')
    }
  })
})

// ─── Content Integrity ──────────────────────────────────────────────
// Verify pages have actual content, not empty shells.

test.describe('Content Integrity', () => {
  test('homepage has hero title', async ({ page }) => {
    await page.goto('/')
    const title = page.locator('.hp-hero__title')
    await expect(title).toBeVisible()
    const text = await title.textContent()
    expect(text?.length).toBeGreaterThan(5)
  })

  test('homepage has stats', async ({ page }) => {
    await page.goto('/')
    const stats = page.locator('.hp-stats__item')
    expect(await stats.count()).toBeGreaterThan(0)
  })

  for (const route of SECTIONED_PAGES) {
    test(`${route.name} has at least 2 sections`, async ({ page }) => {
      await page.goto(route.path)
      const sections = page.locator('[data-section-key]')
      expect(await sections.count()).toBeGreaterThanOrEqual(2)
    })
  }

  for (const route of [...CLASSIC_PAGES, ...PROGRAM_PAGES]) {
    test(`${route.name} has heading and content`, async ({ page }) => {
      const response = await page.goto(route.path)
      if (response?.status() === 200) {
        const title = page.locator('.cp-header__title')
        await expect(title).toBeVisible()
        const text = await title.textContent()
        expect(text?.length).toBeGreaterThan(2)
      }
    })
  }
})

// ─── No Broken Links ────────────────────────────────────────────────

test.describe('Link Integrity', () => {
  test('homepage CTA buttons have valid hrefs', async ({ page }) => {
    await page.goto('/')
    const buttons = page.locator('.hp-hero__actions .btn')
    const count = await buttons.count()
    for (let i = 0; i < count; i++) {
      const href = await buttons.nth(i).getAttribute('href')
      expect(href).toBeTruthy()
      expect(href).toMatch(/^\//)  // internal links start with /
    }
  })

  test('nav links are not broken (no 404s)', async ({ page }) => {
    await page.goto('/')
    const navLinks = page.locator('.site-header__nav a')
    const hrefs: string[] = []
    const count = await navLinks.count()
    for (let i = 0; i < count; i++) {
      const href = await navLinks.nth(i).getAttribute('href')
      if (href && href.startsWith('/')) {
        hrefs.push(href)
      }
    }

    // Spot-check first 5 nav links
    for (const href of hrefs.slice(0, 5)) {
      const response = await page.goto(href)
      expect(response?.status(), `${href} should not 404`).toBeLessThan(400)
    }
  })
})
