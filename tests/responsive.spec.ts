import { test, expect } from '@playwright/test'

/**
 * Responsive layout tests — verifies navigation and sections adapt
 * at different breakpoints. Uses Playwright's device emulation via
 * the mobile-safari and desktop-chrome projects.
 */

test.describe('Responsive Navigation', () => {
  test('desktop: nav links are visible', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'Desktop-only test')
    await page.goto('/')
    const nav = page.locator('.site-header__nav')
    await expect(nav).toBeVisible()
  })

  test('mobile: hamburger menu toggles navigation', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test')
    await page.goto('/')

    const toggle = page.locator('.mobile-menu-toggle')
    await expect(toggle).toBeVisible()

    // Menu should be closed initially
    const mobileNav = page.locator('#mobile-nav')
    await expect(mobileNav).not.toHaveAttribute('data-open', 'true')

    // Open menu
    await toggle.click()
    await expect(mobileNav).toHaveAttribute('data-open', 'true')
  })
})

test.describe('Responsive Sections', () => {
  test('hero section is full-width on all viewports', async ({ page }) => {
    await page.goto('/')
    const hero = page.locator('.hp-hero')
    if (await hero.count() > 0) {
      const box = await hero.boundingBox()
      const viewport = page.viewportSize()
      if (box && viewport) {
        // Hero should span full viewport width (within 2px tolerance)
        expect(Math.abs(box.width - viewport.width)).toBeLessThan(2)
      }
    }
  })

  test('card grids stack on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test')
    await page.goto('/')
    const cards = page.locator('.hp-values__card')
    if (await cards.count() >= 2) {
      const first = await cards.first().boundingBox()
      const second = await cards.nth(1).boundingBox()
      if (first && second) {
        // On mobile, cards should stack (second card below first)
        expect(second.y).toBeGreaterThan(first.y + first.height - 5)
      }
    }
  })
})
