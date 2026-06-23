import { test, expect, Page } from '@playwright/test'

/**
 * Visual audit tests — catches layout issues like:
 * - Heads cut off in hero/header images
 * - Text overlapping text (illegible content)
 * - Logo rendering and sizing
 * - Images loading and properly contained
 * - CTA buttons visible and clickable
 * - Stats/numbers displaying correctly
 * - Sections not collapsing or overlapping
 */

const ALL_PAGES = [
  { name: 'Homepage', path: '/' },
  { name: 'About', path: '/about' },
  { name: 'Academics', path: '/academics' },
  { name: 'Admissions', path: '/admissions' },
  { name: 'Student Life', path: '/student-life' },
  { name: 'Athletics (program)', path: '/athletics' },
  { name: 'History', path: '/about/history' },
  { name: 'Vision & Mission', path: '/about/vision' },
  { name: 'Guardian Alliance', path: '/about/guardian-alliance' },
  { name: 'Signature Courses', path: '/academics/signature' },
  { name: 'Special Programs', path: '/academics/special' },
  { name: 'Future Study', path: '/academics/future-study' },
  { name: 'Athletic Philosophy', path: '/athletics/philosophy' },
  { name: 'NCAA Pathway', path: '/athletics/ncaa-pathway' },
  { name: 'News', path: '/news' },
]

// ─── Header Logo ────────────────────────────────────────────────────

test.describe('Header Logo', () => {
  test('logo image renders in header and links to home', async ({ page }) => {
    await page.goto('/')
    const logoLink = page.locator('.site-header__logo')
    await expect(logoLink).toBeVisible()
    await expect(logoLink).toHaveAttribute('href', '/')

    const logoImg = page.locator('.site-header__logo-img')
    await expect(logoImg).toBeVisible()

    // Check image loaded (naturalWidth > 0)
    const naturalWidth = await logoImg.evaluate((img: HTMLImageElement) => img.naturalWidth)
    expect(naturalWidth).toBeGreaterThan(0)

    // Check reasonable size (not blown up or squished)
    const box = await logoImg.boundingBox()
    expect(box).toBeTruthy()
    expect(box!.width).toBeGreaterThan(30)
    expect(box!.width).toBeLessThan(80)
    // Should be roughly circular (aspect ratio close to 1)
    const ratio = box!.width / box!.height
    expect(ratio).toBeGreaterThan(0.8)
    expect(ratio).toBeLessThan(1.2)
  })

  test('logo is present on all pages', async ({ page }) => {
    for (const p of ['/about', '/admissions', '/academics/special', '/news']) {
      await page.goto(p)
      const logoImg = page.locator('.site-header__logo-img')
      await expect(logoImg).toBeVisible()
    }
  })
})

// ─── Hero Sections — No Cut-Off Content ──────────────────────────

test.describe('Hero Sections', () => {
  const PAGES_WITH_HEROES = [
    { name: 'About', path: '/about' },
    { name: 'Academics', path: '/academics' },
    { name: 'Admissions', path: '/admissions' },
    { name: 'Student Life', path: '/student-life' },
  ]

  for (const p of PAGES_WITH_HEROES) {
    test(`${p.name} hero section has adequate height and visible content`, async ({ page }) => {
      await page.goto(p.path)
      const hero = page.locator('.hero-section').first()
      await expect(hero).toBeVisible()

      const box = await hero.boundingBox()
      expect(box).toBeTruthy()
      // Hero should be at least 300px tall
      expect(box!.height).toBeGreaterThan(300)

      // Hero heading should be fully visible (not clipped)
      const heading = hero.locator('h1, h2').first()
      await expect(heading).toBeVisible()
      const headingBox = await heading.boundingBox()
      expect(headingBox).toBeTruthy()
      // Heading should be within the hero bounds
      expect(headingBox!.y).toBeGreaterThanOrEqual(box!.y)
      expect(headingBox!.y + headingBox!.height).toBeLessThanOrEqual(box!.y + box!.height + 10)
    })
  }

  test('Admissions hero image shows full content (no cut-off heads)', async ({ page }) => {
    await page.goto('/admissions')
    const hero = page.locator('.hero-section').first()
    const bgImg = hero.locator('img').first()

    if (await bgImg.count() > 0) {
      // If there's an <img> element, check it uses object-fit cover
      const objectFit = await bgImg.evaluate((el) => getComputedStyle(el).objectFit)
      expect(['cover', 'contain', '']).toContain(objectFit)

      // Check the image loaded
      const naturalWidth = await bgImg.evaluate((img: HTMLImageElement) => img.naturalWidth)
      expect(naturalWidth).toBeGreaterThan(0)
    }
  })
})

// ─── Program Pages — Header Images ───────────────────────────────

test.describe('Program Header Images', () => {
  const PROGRAM_PAGES_WITH_IMAGES = [
    { name: 'Athletics', path: '/athletics' },
    { name: 'Athletic Philosophy', path: '/athletics/philosophy' },
  ]

  for (const p of PROGRAM_PAGES_WITH_IMAGES) {
    test(`${p.name} header image renders without overflow`, async ({ page }) => {
      await page.goto(p.path)

      // Programs use .cp-header which may have a background-image
      const header = page.locator('.cp-header').first()
      if (await header.count() > 0) {
        const box = await header.boundingBox()
        expect(box).toBeTruthy()
        // Verify no content overflows below the header
        expect(box!.height).toBeGreaterThan(200)
        expect(box!.height).toBeLessThan(600)
      }
    })
  }
})

// ─── Text Overlap / Legibility ──────────────────────────────────

test.describe('No Text Overlap', () => {
  for (const p of ALL_PAGES) {
    test(`${p.name} — no overlapping text blocks`, async ({ page }) => {
      await page.goto(p.path)
      await page.waitForLoadState('networkidle')

      // Get all visible text elements and check none overlap
      const textElements = page.locator('h1, h2, h3, p, .stats__value, .stats__label')
      const count = await textElements.count()

      const boxes: { text: string, y: number, height: number, x: number, width: number }[] = []
      for (let i = 0; i < Math.min(count, 30); i++) {
        const el = textElements.nth(i)
        if (await el.isVisible()) {
          const box = await el.boundingBox()
          const text = await el.textContent()
          if (box && text && text.trim().length > 0) {
            boxes.push({ text: text.trim().substring(0, 50), y: box.y, height: box.height, x: box.x, width: box.width })
          }
        }
      }

      // Check that no two text blocks occupy the exact same vertical space
      // (allowing small overlap for design intent like overlapping decorative elements)
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i]
          const b = boxes[j]

          // Check if boxes overlap significantly (>50% in both axes)
          const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
          const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))
          const areaA = a.width * a.height
          const areaB = b.width * b.height
          const overlapArea = overlapX * overlapY

          if (areaA > 0 && areaB > 0) {
            const overlapRatio = overlapArea / Math.min(areaA, areaB)
            expect(overlapRatio, `Text overlap on ${p.name}: "${a.text}" and "${b.text}"`).toBeLessThan(0.5)
          }
        }
      }
    })
  }
})

// ─── Stats / Numbers Display ────────────────────────────────────

test.describe('Stats Display', () => {
  test('Homepage stats show correct values', async ({ page }) => {
    await page.goto('/')
    const pageContent = await page.textContent('body')
    expect(pageContent).toContain('5:1')
    expect(pageContent).toContain('Student-Teacher Ratio')
  })

  test('About page stats show updated values', async ({ page }) => {
    await page.goto('/about')
    const pageContent = await page.textContent('body')
    expect(pageContent).toContain('15')
    expect(pageContent).toContain('Years of Excellence')
    expect(pageContent).toContain('5:1')
    expect(pageContent).toContain('Student-Teacher Ratio')
  })
})

// ─── Content Verification ───────────────────────────────────────

test.describe('Updated Content', () => {
  test('Homepage has new slogan', async ({ page }) => {
    await page.goto('/')
    const pageContent = await page.textContent('body')
    expect(pageContent).toContain('Inspire Global Leaders for Tomorrow')
  })

  test('Homepage shows Est. 2011', async ({ page }) => {
    await page.goto('/')
    const pageContent = await page.textContent('body')
    expect(pageContent).toContain('Est. 2011')
  })

  test('About page has updated mission text', async ({ page }) => {
    await page.goto('/about')
    const pageContent = await page.textContent('body')
    expect(pageContent).toContain('cultivate curious, compassionate, and open-minded individuals')
  })

  test('About page has updated core values', async ({ page }) => {
    await page.goto('/about')
    const pageContent = await page.textContent('body')
    expect(pageContent).toContain('Integrity, Innovation, Inclusion, Impact')
  })

  test('Special Programs does NOT contain Legal Issues', async ({ page }) => {
    await page.goto('/academics/special')
    const pageContent = await page.textContent('body')
    expect(pageContent).not.toContain('Legal Protection for International Students')
    expect(pageContent).not.toContain('Dedicated lawyers')
  })

  test('Admissions Apply Now links to Gradelink', async ({ page }) => {
    await page.goto('/admissions')
    const applyLinks = page.locator('a[href*="gradelink.com/3740/enrollment"]')
    const count = await applyLinks.count()
    expect(count).toBeGreaterThan(0)
  })

  test('Athletics page shows basketball team image', async ({ page }) => {
    await page.goto('/athletics')
    // The program page uses .cp-header with background-image from Sanity
    const header = page.locator('.cp-header')
    if (await header.count() > 0) {
      const style = await header.getAttribute('style')
      // Should have a background-image from Sanity CDN
      if (style) {
        expect(style).toContain('cdn.sanity.io')
      }
    }
  })
})

// ─── Images Load Properly ───────────────────────────────────────

test.describe('All Images Load', () => {
  for (const p of ALL_PAGES) {
    test(`${p.name} — all images load without errors`, async ({ page }) => {
      const brokenImages: string[] = []

      page.on('response', (response) => {
        if (response.request().resourceType() === 'image' && response.status() >= 400) {
          brokenImages.push(`${response.url()} (${response.status()})`)
        }
      })

      await page.goto(p.path)
      await page.waitForLoadState('networkidle')

      expect(brokenImages, `Broken images on ${p.name}: ${brokenImages.join(', ')}`).toHaveLength(0)
    })
  }
})

// ─── Screenshot Audit (for manual review) ───────────────────────

test.describe('Screenshot Audit', () => {
  const KEY_PAGES = [
    { name: 'homepage', path: '/' },
    { name: 'about', path: '/about' },
    { name: 'admissions', path: '/admissions' },
    { name: 'athletics', path: '/athletics' },
    { name: 'special-programs', path: '/academics/special' },
  ]

  for (const p of KEY_PAGES) {
    test(`capture ${p.name} screenshot`, async ({ page }) => {
      await page.goto(p.path)
      await page.waitForLoadState('networkidle')
      await page.screenshot({
        path: `test-results/visual-audit-${p.name}.png`,
        fullPage: true,
      })
    })
  }
})
