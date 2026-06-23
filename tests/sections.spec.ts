import { test, expect } from '@playwright/test'

/**
 * Section rendering tests — verifies that each section type renders
 * when present on a page. Requires at least one page with sections
 * populated in Sanity.
 *
 * These tests run against the live site (dev or production).
 */

test.describe('Section Rendering', () => {
  test('heroSection renders with heading', async ({ page }) => {
    // Navigate to a page known to have a heroSection
    // This will need updating once content is populated
    const response = await page.goto('/about')
    expect(response?.status()).toBeLessThan(400)

    const hero = page.locator('[data-section-key] .hero-section')
    if (await hero.count() > 0) {
      await expect(hero.first()).toBeVisible()
      // First hero should use h1
      const h1 = hero.first().locator('.hero-section__heading')
      await expect(h1).toBeVisible()
    }
  })

  test('cardGrid renders cards', async ({ page }) => {
    const response = await page.goto('/academics')
    expect(response?.status()).toBeLessThan(400)

    const grid = page.locator('[data-section-key] .cg-section')
    if (await grid.count() > 0) {
      const cards = grid.first().locator('.cg-card')
      expect(await cards.count()).toBeGreaterThan(0)
    }
  })

  test('accordionSection items expand on click', async ({ page }) => {
    const response = await page.goto('/admissions')
    expect(response?.status()).toBeLessThan(400)

    const accordion = page.locator('[data-section-key] .acc-section')
    if (await accordion.count() > 0) {
      const firstItem = accordion.first().locator('.acc-section__item').first()
      const answer = firstItem.locator('.acc-section__answer')

      // Click to open
      await firstItem.locator('.acc-section__question').click()
      await expect(firstItem).toHaveAttribute('open', '')
    }
  })

  test('ctaBanner renders with heading and buttons', async ({ page }) => {
    const response = await page.goto('/about')
    expect(response?.status()).toBeLessThan(400)

    const cta = page.locator('[data-section-key] .cta-banner')
    if (await cta.count() > 0) {
      await expect(cta.first().locator('.cta-banner__heading')).toBeVisible()
    }
  })

  test('statsRow renders stat items', async ({ page }) => {
    const response = await page.goto('/about')
    expect(response?.status()).toBeLessThan(400)

    const stats = page.locator('[data-section-key] .sr-section')
    if (await stats.count() > 0) {
      const items = stats.first().locator('.sr-section__item')
      expect(await items.count()).toBeGreaterThan(0)
    }
  })

  test('testimonialBlock renders quote and attribution', async ({ page }) => {
    const response = await page.goto('/about')
    expect(response?.status()).toBeLessThan(400)

    const testimonial = page.locator('[data-section-key] .tb-section')
    if (await testimonial.count() > 0) {
      await expect(testimonial.first().locator('.tb-section__quote')).toBeVisible()
      await expect(testimonial.first().locator('.tb-section__name')).toBeVisible()
    }
  })

  test('richText section renders content', async ({ page }) => {
    const response = await page.goto('/about')
    expect(response?.status()).toBeLessThan(400)

    const richText = page.locator('[data-section-key] .rt-section')
    if (await richText.count() > 0) {
      await expect(richText.first()).toBeVisible()
    }
  })

  test('textWithImage renders text and image', async ({ page }) => {
    const response = await page.goto('/academics')
    expect(response?.status()).toBeLessThan(400)

    const twi = page.locator('[data-section-key] .twi-section')
    if (await twi.count() > 0) {
      await expect(twi.first().locator('.twi-section__text')).toBeVisible()
      // Media column only present when an image is uploaded
      const media = twi.first().locator('.twi-section__media')
      const hasMedia = await media.count() > 0
      if (hasMedia) {
        await expect(media).toBeVisible()
      } else {
        // No-image fallback: section should have full-width text
        await expect(twi.first()).toHaveClass(/twi-section--no-image/)
      }
    }
  })

  test('backward compat: pages with body-only render in classic layout', async ({ page }) => {
    // Visit a page that uses body (no sections) — e.g. a history page
    const response = await page.goto('/about/history')
    expect(response?.status()).toBeLessThan(400)

    // Should have the classic content page header
    const header = page.locator('.cp-header')
    if (await header.count() > 0) {
      await expect(header).toBeVisible()
      await expect(page.locator('.cp-article')).toBeVisible()
    }
  })
})
