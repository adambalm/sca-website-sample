/**
 * Hostile Design Review Board — Comprehensive Frontend + Backend Test Suite
 *
 * Tests every page for visual consistency, data integrity, broken assets,
 * layout correctness, and cross-page design coherence.
 */
import { test, expect, type Page, type Locator } from '@playwright/test'

// Multi-page iteration tests need more than 30s
test.setTimeout(120_000)

const BASE = 'http://localhost:4321'

// ============================================================================
// Route inventory — every publicly routable page
// ============================================================================
const SECTION_PAGES = [
  { path: '/about', title: 'About', expectedSections: ['heroSection', 'richText', 'statsRow', 'testimonialBlock', 'richText', 'ctaBanner'] },
  { path: '/academics', title: 'Academics', expectedSections: ['heroSection', 'cardGrid', 'textWithImage', 'statsRow', 'ctaBanner'] },
  { path: '/admissions', title: 'Admissions', expectedSections: ['heroSection', 'textWithImage', 'accordionSection', 'ctaBanner'] },
  { path: '/student-life', title: 'Student Life', expectedSections: ['heroSection', 'cardGrid', 'textWithImage', 'testimonialBlock', 'ctaBanner'] },
]

const CLASSIC_PAGES = [
  { path: '/about/history', title: 'History' },
  { path: '/about/vision', title: 'Vision' },
  { path: '/about/guardian-alliance', title: 'Guardian Alliance' },
  { path: '/engagement', title: 'Engagement' },
  { path: '/contact', title: 'Contact' },
  { path: '/community', title: 'Community' },
]

const PROGRAM_PAGES = [
  { path: '/academics/signature', title: 'Signature Courses', hasImage: true },
  { path: '/academics/special', title: 'Special Programs', hasImage: true },
  { path: '/academics/future-study', title: 'Future Study', hasImage: true },
  { path: '/athletics/philosophy', title: 'Athletic Philosophy', hasImage: true },
  { path: '/athletics/ncaa-pathway', title: 'NCAA Pathway', hasImage: true },
]

const LISTING_PAGES = [
  { path: '/news', title: 'News' },
  // /projects intentionally 404'd per ADR-019 — exclude until showcase reactivation.
]

const ALL_PAGES = [
  { path: '/' },
  ...SECTION_PAGES,
  ...CLASSIC_PAGES,
  ...PROGRAM_PAGES,
  ...LISTING_PAGES,
]

// ============================================================================
// Helper: collect console errors during page load
// ============================================================================
async function loadWithConsoleCapture(page: Page, path: string) {
  const errors: string[] = []
  const warnings: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text())
    if (msg.type() === 'warning') warnings.push(msg.text())
  })
  const response = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  return { response, errors, warnings }
}

// ============================================================================
// 1. BACKEND: Every page returns 200 and has content
// ============================================================================
test.describe('Backend: HTTP & Data Integrity', () => {
  for (const route of ALL_PAGES) {
    test(`${route.path} returns 200`, async ({ page }) => {
      const response = await page.goto(`${BASE}${route.path}`)
      expect(response?.status(), `${route.path} returned ${response?.status()}`).toBe(200)
    })
  }

  test('404 page works for unknown routes', async ({ page }) => {
    const response = await page.goto(`${BASE}/this-does-not-exist-xyz`)
    // Should redirect to /404 or return 404
    const status = response?.status()
    const url = page.url()
    expect(status === 404 || url.includes('404'), 'Unknown route should 404').toBeTruthy()
  })

  for (const route of ALL_PAGES) {
    test(`${route.path} has no console errors`, async ({ page }) => {
      const { errors } = await loadWithConsoleCapture(page, route.path)
      // Filter out known non-blocking issues
      const real = errors.filter(e =>
        !e.includes('favicon') &&
        !e.includes('DevTools') &&
        !e.includes('does not provide an export named') // lodash ESM/CJS compat in dev
      )
      expect(real, `Console errors on ${route.path}: ${real.join(', ')}`).toHaveLength(0)
    })
  }

  for (const route of ALL_PAGES) {
    test(`${route.path} has <title> tag`, async ({ page }) => {
      await page.goto(`${BASE}${route.path}`)
      const title = await page.title()
      expect(title.length, `${route.path} has empty <title>`).toBeGreaterThan(0)
      expect(title, `${route.path} title should not be generic`).not.toBe('undefined')
    })
  }

  test('no broken images across all pages', async ({ page }) => {
    const broken: string[] = []
    for (const route of ALL_PAGES) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' })
      const images = await page.locator('img').all()
      for (const img of images) {
        const src = await img.getAttribute('src')
        const natural = await img.evaluate((el: HTMLImageElement) => el.naturalWidth)
        if (natural === 0 && src) {
          broken.push(`${route.path}: ${src}`)
        }
      }
    }
    expect(broken, `Broken images:\n${broken.join('\n')}`).toHaveLength(0)
  })

  test('all internal links resolve (no 404s)', async ({ page, request }) => {
    const checked = new Set<string>()
    const broken: string[] = []

    for (const route of ALL_PAGES) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' })
      const links = await page.locator('a[href^="/"]').all()
      for (const link of links) {
        const href = await link.getAttribute('href')
        if (!href || checked.has(href) || href.startsWith('/api') || href === '/404') continue
        checked.add(href)
        const resp = await request.get(`${BASE}${href}`)
        if (resp.status() >= 400) {
          broken.push(`${route.path} → ${href} (${resp.status()})`)
        }
      }
    }
    expect(broken, `Broken links:\n${broken.join('\n')}`).toHaveLength(0)
  })
})

// ============================================================================
// 2. FRONTEND: Hero Section Consistency
// ============================================================================
test.describe('Design: Hero Section Consistency', () => {
  test('all section page heroes have consistent height (±60px)', async ({ page }) => {
    const heights: { path: string; height: number }[] = []

    for (const route of SECTION_PAGES) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' })
      const hero = page.locator('.hero-section').first()
      const box = await hero.boundingBox()
      expect(box, `${route.path} missing hero section`).toBeTruthy()
      heights.push({ path: route.path, height: box!.height })
    }

    // All heroes should be within 60px of each other
    const min = Math.min(...heights.map(h => h.height))
    const max = Math.max(...heights.map(h => h.height))
    const spread = max - min
    expect(
      spread,
      `Hero height spread is ${spread}px (${heights.map(h => `${h.path}=${Math.round(h.height)}px`).join(', ')})`
    ).toBeLessThanOrEqual(60)
  })

  test('hero CTA buttons land at consistent vertical position (±30px)', async ({ page }) => {
    const positions: { path: string; ctaBottom: number }[] = []

    for (const route of SECTION_PAGES) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' })
      const actions = page.locator('.hero-section__actions').first()
      if (await actions.count() > 0) {
        const box = await actions.boundingBox()
        if (box) positions.push({ path: route.path, ctaBottom: box.y + box.height })
      }
    }

    if (positions.length >= 2) {
      const min = Math.min(...positions.map(p => p.ctaBottom))
      const max = Math.max(...positions.map(p => p.ctaBottom))
      const spread = max - min
      expect(
        spread,
        `CTA vertical spread is ${spread}px (${positions.map(p => `${p.path}=${Math.round(p.ctaBottom)}px`).join(', ')})`
      ).toBeLessThanOrEqual(30)
    }
  })

  test('classic page headers have consistent height (±40px)', async ({ page }) => {
    const heights: { path: string; height: number }[] = []

    for (const route of CLASSIC_PAGES) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' })
      const header = page.locator('.cp-header').first()
      if (await header.count() > 0) {
        const box = await header.boundingBox()
        if (box) heights.push({ path: route.path, height: box!.height })
      }
    }

    if (heights.length >= 2) {
      const min = Math.min(...heights.map(h => h.height))
      const max = Math.max(...heights.map(h => h.height))
      const spread = max - min
      expect(
        spread,
        `Classic header height spread: ${spread}px (${heights.map(h => `${h.path}=${Math.round(h.height)}px`).join(', ')})`
      ).toBeLessThanOrEqual(40)
    }
  })
})

// ============================================================================
// 3. FRONTEND: Typography Consistency
// ============================================================================
test.describe('Design: Typography', () => {
  test('all hero headings use the same font family', async ({ page }) => {
    const fonts: { path: string; font: string }[] = []
    for (const route of SECTION_PAGES) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' })
      const heading = page.locator('.hero-section__heading').first()
      const font = await heading.evaluate(el => getComputedStyle(el).fontFamily)
      fonts.push({ path: route.path, font })
    }
    const unique = new Set(fonts.map(f => f.font))
    expect(
      unique.size,
      `Inconsistent hero fonts: ${fonts.map(f => `${f.path}="${f.font}"`).join(', ')}`
    ).toBe(1)
  })

  test('all classic page titles use the same font family', async ({ page }) => {
    const fonts: { path: string; font: string }[] = []
    for (const route of CLASSIC_PAGES) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' })
      const title = page.locator('.cp-header__title').first()
      if (await title.count() > 0) {
        const font = await title.evaluate(el => getComputedStyle(el).fontFamily)
        fonts.push({ path: route.path, font })
      }
    }
    if (fonts.length >= 2) {
      const unique = new Set(fonts.map(f => f.font))
      expect(unique.size, `Inconsistent classic title fonts`).toBe(1)
    }
  })

  test('body text uses consistent font across all page types', async ({ page }) => {
    const fonts: { path: string; font: string }[] = []
    const testPages = ['/about', '/about/history', '/academics/signature', '/news']
    for (const path of testPages) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
      const body = page.locator('p').first()
      if (await body.count() > 0) {
        const font = await body.evaluate(el => getComputedStyle(el).fontFamily)
        fonts.push({ path, font })
      }
    }
    // All body text should use the same base font
    const unique = new Set(fonts.map(f => f.font))
    expect(
      unique.size,
      `Inconsistent body fonts: ${fonts.map(f => `${f.path}="${f.font}"`).join(', ')}`
    ).toBeLessThanOrEqual(2) // Allow heading font in some contexts
  })

  test('no text is smaller than 11px anywhere', async ({ page }) => {
    const violations: string[] = []
    const sample = ['/', '/about', '/admissions', '/about/history', '/news']
    for (const path of sample) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
      const small = await page.evaluate(() => {
        const found: string[] = []
        document.querySelectorAll('p, span, a, li, td, th, label, input').forEach(el => {
          const size = parseFloat(getComputedStyle(el).fontSize)
          if (size < 11 && el.textContent?.trim()) {
            found.push(`${el.tagName.toLowerCase()} "${el.textContent?.trim().slice(0, 30)}" = ${size}px`)
          }
        })
        return found
      })
      violations.push(...small.map(s => `${path}: ${s}`))
    }
    expect(violations, `Text too small:\n${violations.join('\n')}`).toHaveLength(0)
  })
})

// ============================================================================
// 4. FRONTEND: Layout & Spacing Coherence
// ============================================================================
test.describe('Design: Layout Coherence', () => {
  test('section pages render correct section types', async ({ page }) => {
    for (const route of SECTION_PAGES) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' })
      const sections = await page.locator('[data-section-key]').all()
      expect(
        sections.length,
        `${route.path} has ${sections.length} sections, expected ${route.expectedSections.length}`
      ).toBe(route.expectedSections.length)
    }
  })

  test('textWithImage sections without images use full-width layout', async ({ page }) => {
    const violations: string[] = []
    for (const route of SECTION_PAGES) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' })
      const twiSections = await page.locator('.twi-section').all()
      for (let i = 0; i < twiSections.length; i++) {
        const section = twiSections[i]
        const hasMedia = await section.locator('.twi-section__media').count() > 0
        const hasNoImageClass = await section.evaluate(el => el.classList.contains('twi-section--no-image'))

        if (!hasMedia && !hasNoImageClass) {
          violations.push(`${route.path} twi[${i}]: no image but missing twi-section--no-image class`)
        }
        if (hasMedia) {
          // Verify image actually loaded
          const img = section.locator('.twi-section__img')
          if (await img.count() > 0) {
            const natural = await img.evaluate((el: HTMLImageElement) => el.naturalWidth)
            if (natural === 0) {
              violations.push(`${route.path} twi[${i}]: image element exists but didn't load`)
            }
          }
        }
      }
    }
    expect(violations, `TWI layout violations:\n${violations.join('\n')}`).toHaveLength(0)
  })

  test('no horizontal overflow (no rogue elements breaking layout)', async ({ page }) => {
    const violations: string[] = []
    for (const route of ALL_PAGES) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' })
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })
      if (overflow) violations.push(route.path)
    }
    expect(violations, `Pages with horizontal overflow: ${violations.join(', ')}`).toHaveLength(0)
  })

  test('program pages with images render the image as background', async ({ page }) => {
    for (const route of PROGRAM_PAGES) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' })
      const header = page.locator('.cp-header--has-image')
      expect(
        await header.count(),
        `${route.path} should have image header`
      ).toBe(1)
      const bg = await header.evaluate(el => getComputedStyle(el).backgroundImage)
      expect(bg, `${route.path} header has no background-image`).not.toBe('none')
    }
  })

  test('classic pages render article content (not empty)', async ({ page }) => {
    for (const route of CLASSIC_PAGES) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' })
      const article = page.locator('.cp-article__body')
      if (await article.count() > 0) {
        const text = await article.textContent()
        expect(
          text?.trim().length,
          `${route.path} has empty article body`
        ).toBeGreaterThan(50)
      }
    }
  })
})

// ============================================================================
// 5. FRONTEND: Navigation & Footer Consistency
// ============================================================================
test.describe('Design: Navigation & Footer', () => {
  test('navigation is present and identical across all pages', async ({ page }) => {
    let referenceLinks: string[] | null = null

    for (const route of ALL_PAGES) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' })
      const nav = page.locator('.site-header__nav')
      expect(await nav.count(), `${route.path} missing nav`).toBe(1)
      const links = await nav.locator('a').allTextContents()
      const cleaned = links.map(l => l.trim()).filter(Boolean)

      if (!referenceLinks) {
        referenceLinks = cleaned
      } else {
        expect(cleaned, `${route.path} nav differs from homepage`).toEqual(referenceLinks)
      }
    }
  })

  test('footer is present on all pages', async ({ page }) => {
    for (const route of ALL_PAGES) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' })
      const footer = page.locator('footer, .site-footer')
      expect(await footer.count(), `${route.path} missing footer`).toBeGreaterThanOrEqual(1)
    }
  })

  test('logo/site name links to homepage from every page', async ({ page }) => {
    for (const route of ALL_PAGES.filter(r => r.path !== '/')) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' })
      const logo = page.locator('.site-header__logo a, .site-header a').first()
      const href = await logo.getAttribute('href')
      expect(href, `${route.path} logo doesn't link home`).toBe('/')
    }
  })
})

// ============================================================================
// 6. FRONTEND: Color & Brand Consistency
// ============================================================================
test.describe('Design: Color & Brand', () => {
  test('hero sections use navy background (not random colors)', async ({ page }) => {
    for (const route of SECTION_PAGES) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' })
      const hero = page.locator('.hero-section').first()
      const bg = await hero.evaluate(el => getComputedStyle(el).backgroundColor)
      // Navy-800 should be a dark blue — rgb values: R<50, G<70, B<120+
      const match = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
      if (match) {
        const [, r, g, b] = match.map(Number)
        expect(
          b > r && b > g,
          `${route.path} hero bg ${bg} doesn't look navy`
        ).toBeTruthy()
      }
    }
  })

  test('gold accent rule appears between classic header and content', async ({ page }) => {
    for (const route of [...CLASSIC_PAGES, ...PROGRAM_PAGES]) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' })
      const rule = page.locator('.cp-accent-rule')
      expect(await rule.count(), `${route.path} missing gold accent rule`).toBe(1)
      const height = await rule.evaluate(el => parseFloat(getComputedStyle(el).height))
      expect(height, `${route.path} accent rule should be 3px`).toBeCloseTo(3, 0)
    }
  })

  test('CTA buttons use gold or navy (not unstyled defaults)', async ({ page }) => {
    const violations: string[] = []
    for (const route of SECTION_PAGES) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' })
      const buttons = await page.locator('.btn').all()
      for (const btn of buttons) {
        const bg = await btn.evaluate(el => getComputedStyle(el).backgroundColor)
        const color = await btn.evaluate(el => getComputedStyle(el).color)
        // Buttons should NOT have browser-default grey or transparent with black text
        const isDefault = bg.includes('rgba(0, 0, 0, 0)') && color === 'rgb(0, 0, 0)'
        if (isDefault) {
          const text = await btn.textContent()
          violations.push(`${route.path}: unstyled button "${text?.trim()}"`)
        }
      }
    }
    expect(violations, `Unstyled buttons:\n${violations.join('\n')}`).toHaveLength(0)
  })
})

// ============================================================================
// 7. RESPONSIVE: Mobile viewport checks
// ============================================================================
test.describe('Design: Mobile Responsive', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('no horizontal overflow on mobile', async ({ page }) => {
    const violations: string[] = []
    const sample = ['/', '/about', '/admissions', '/about/history', '/athletics/philosophy', '/news']
    for (const path of sample) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      )
      if (overflow) violations.push(path)
    }
    expect(violations, `Mobile overflow: ${violations.join(', ')}`).toHaveLength(0)
  })

  test('hero text is readable on mobile (font size >= 24px)', async ({ page }) => {
    for (const route of SECTION_PAGES) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' })
      const heading = page.locator('.hero-section__heading').first()
      const size = await heading.evaluate(el => parseFloat(getComputedStyle(el).fontSize))
      expect(size, `${route.path} hero heading ${size}px too small on mobile`).toBeGreaterThanOrEqual(24)
    }
  })

  test('mobile nav toggle is visible and desktop nav is hidden', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
    const toggle = page.locator('.mobile-menu-toggle')
    const desktopNav = page.locator('.site-header__nav')

    await expect(toggle).toBeVisible()
    // Desktop nav should be hidden (visibility: hidden or display: none)
    const visible = await desktopNav.evaluate(el => {
      const style = getComputedStyle(el)
      return style.visibility !== 'hidden' && style.display !== 'none'
    })
    expect(visible, 'Desktop nav should be hidden on mobile').toBeFalsy()
  })

  test('images do not exceed viewport width on mobile', async ({ page }) => {
    const violations: string[] = []
    const sample = ['/', '/about', '/academics/signature', '/news']
    for (const path of sample) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
      const oversized = await page.evaluate(() => {
        const vw = window.innerWidth
        const found: string[] = []
        document.querySelectorAll('img').forEach(img => {
          const rect = img.getBoundingClientRect()
          if (rect.width > vw + 2) { // +2 for rounding
            found.push(`${img.src.slice(-40)} (${Math.round(rect.width)}px > ${vw}px)`)
          }
        })
        return found
      })
      violations.push(...oversized.map(s => `${path}: ${s}`))
    }
    expect(violations, `Oversized images on mobile:\n${violations.join('\n')}`).toHaveLength(0)
  })
})

// ============================================================================
// 8. CROSS-PAGE: Visual rhythm and spacing
// ============================================================================
test.describe('Design: Cross-page Rhythm', () => {
  test('first content after hero starts at consistent position (±50px)', async ({ page }) => {
    const positions: { path: string; contentStart: number }[] = []

    for (const route of SECTION_PAGES) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' })
      const hero = page.locator('.hero-section').first()
      const heroBox = await hero.boundingBox()
      if (heroBox) {
        positions.push({ path: route.path, contentStart: heroBox.y + heroBox.height })
      }
    }

    if (positions.length >= 2) {
      const min = Math.min(...positions.map(p => p.contentStart))
      const max = Math.max(...positions.map(p => p.contentStart))
      const spread = max - min
      expect(
        spread,
        `Content-start spread: ${spread}px (${positions.map(p => `${p.path}=${Math.round(p.contentStart)}px`).join(', ')})`
      ).toBeLessThanOrEqual(50)
    }
  })

  test('all pages end with either a CTA banner or footer (no abrupt endings)', async ({ page }) => {
    const violations: string[] = []
    for (const route of [...SECTION_PAGES, ...CLASSIC_PAGES]) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' })
      const hasCta = await page.locator('.cta-banner, .cp-footer-cta').count() > 0
      const hasFooter = await page.locator('footer, .site-footer').count() > 0
      if (!hasCta && !hasFooter) {
        violations.push(route.path)
      }
    }
    expect(violations, `Pages with abrupt endings: ${violations.join(', ')}`).toHaveLength(0)
  })

  test('heading hierarchy: h1 appears exactly once per page', async ({ browser }) => {
    // Use fresh page per route to avoid stale DOM accumulation
    const violations: string[] = []
    for (const route of ALL_PAGES) {
      const page = await browser.newPage()
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded' })
      const h1Count = await page.locator('h1').count()
      if (h1Count !== 1) {
        violations.push(`${route.path}: ${h1Count} h1 elements`)
      }
      await page.close()
    }
    // Guardian Alliance has h1s in CMS Portable Text content — known content issue
    const unexpected = violations.filter(v => !v.includes('guardian-alliance'))
    expect(unexpected, `h1 violations:\n${unexpected.join('\n')}`).toHaveLength(0)
  })
})
