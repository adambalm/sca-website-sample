/**
 * Full site smoke test — Playwright
 *
 * Tests homepage CMS content, theme switching, navigation,
 * news pages, and stega encoding against a given base URL.
 *
 * Usage:
 *   node scripts/test-full-site.mjs [baseUrl]
 *   Default: https://web-beta-lilac-27.vercel.app
 */

import { chromium } from 'playwright';

const BASE = process.argv[2] || 'https://web-beta-lilac-27.vercel.app';
let passed = 0;
let failed = 0;
const results = [];

function ok(name) {
  passed++;
  results.push(`  PASS  ${name}`);
}
function fail(name, reason) {
  failed++;
  results.push(`  FAIL  ${name} — ${reason}`);
}

async function test(name, fn) {
  try {
    await fn();
    ok(name);
  } catch (e) {
    fail(name, e.message.split('\n')[0]);
  }
}

(async () => {
  console.log(`\nTesting: ${BASE}\n${'='.repeat(60)}`);
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // ========== HOMEPAGE ==========
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });

  await test('Homepage loads (200)', async () => {
    const title = await page.title();
    if (!title) throw new Error('No page title');
  });

  await test('Hero title from CMS', async () => {
    const hero = await page.locator('.hp-hero__title').textContent();
    if (!hero || hero.trim().length === 0) throw new Error('Hero title empty');
    // Check it contains the CMS content (with or without stega)
    if (!hero.includes('Global Leaders')) throw new Error(`Unexpected hero: "${hero.substring(0, 50)}"`);
  });

  await test('Hero eyebrow from CMS', async () => {
    const eyebrow = await page.locator('.hp-hero__eyebrow').textContent();
    if (!eyebrow || !eyebrow.includes('Springfield')) throw new Error(`Unexpected eyebrow: "${eyebrow}"`);
  });

  await test('Hero CTAs render', async () => {
    const primaryBtn = page.locator('.hp-hero__actions .btn--primary');
    const secondaryBtn = page.locator('.hp-hero__actions .btn--secondary-light');
    if (await primaryBtn.count() === 0) throw new Error('No primary CTA');
    if (await secondaryBtn.count() === 0) throw new Error('No secondary CTA');
  });

  await test('Value props section (6 cards)', async () => {
    const cards = await page.locator('.hp-values__card').count();
    if (cards !== 6) throw new Error(`Expected 6 value prop cards, got ${cards}`);
  });

  await test('News section renders', async () => {
    const newsCards = await page.locator('.hp-news__grid .news-card, .hp-news__grid article').count();
    if (newsCards === 0) throw new Error('No news cards on homepage');
  });

  await test('Programs section (3 cards)', async () => {
    const progCards = await page.locator('.hp-programs__card').count();
    if (progCards < 2) throw new Error(`Expected 2-3 program cards, got ${progCards}`);
  });

  await test('CTA banner renders', async () => {
    const ctaTitle = await page.locator('.hp-cta__title').textContent();
    if (!ctaTitle || ctaTitle.trim().length === 0) throw new Error('CTA title empty');
  });

  // ========== NAVIGATION ==========
  await test('Navigation has items', async () => {
    const navLinks = await page.locator('.site-header__nav-link').count();
    if (navLinks < 5) throw new Error(`Expected 5+ nav links, got ${navLinks}`);
  });

  await test('Footer renders with school name', async () => {
    const footer = await page.locator('.site-footer').textContent();
    if (!footer.includes('Springfield')) throw new Error('Footer missing school name');
  });

  // ========== STEGA ENCODING ==========
  await test('Stega encoding present in page source', async () => {
    const html = await page.content();
    // Stega uses invisible Unicode characters (U+200B range)
    const hasStega = html.includes('\u200B') || html.includes('data-sanity');
    if (!hasStega) throw new Error('No stega encoding detected');
  });

  // ========== THEME SWITCHING ==========
  await test('Theme switching (?theme=alt)', async () => {
    await page.goto(`${BASE}/?theme=alt`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const theme = await page.getAttribute('html', 'data-theme');
    if (theme !== 'alt') throw new Error(`Expected data-theme="alt", got "${theme}"`);
  });

  await test('Alt theme has different CSS variables', async () => {
    const navy900 = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--navy-900').trim()
    );
    // Alt theme uses forest green (#0A1A12), not navy (#0A1628)
    if (navy900 === '#0A1628') throw new Error('Alt theme has same navy-900 as default');
    if (!navy900) throw new Error('--navy-900 not set');
  });

  await test('Default theme loads without param', async () => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const theme = await page.getAttribute('html', 'data-theme');
    if (theme !== 'default') throw new Error(`Expected data-theme="default", got "${theme}"`);
  });

  // ========== NEWS LISTING ==========
  await test('News listing page loads', async () => {
    await page.goto(`${BASE}/news`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const h1 = await page.locator('h1').first().textContent();
    if (!h1) throw new Error('No h1 on news page');
  });

  await test('News listing has articles', async () => {
    const articles = await page.locator('.news-card, article').count();
    if (articles === 0) throw new Error('No articles on news listing');
  });

  // ========== NEWS DETAIL ==========
  await test('News detail page loads', async () => {
    // Click first article link
    const firstLink = page.locator('a[href^="/news/"]').first();
    if (await firstLink.count() === 0) throw new Error('No news article links found');
    const href = await firstLink.getAttribute('href');
    await page.goto(`${BASE}${href}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const title = await page.locator('h1').first().textContent();
    if (!title || title.trim().length === 0) throw new Error('News detail has no title');
  });

  // ========== CONTENT PAGES ==========
  const contentPages = ['/about', '/academics', '/athletics', '/admissions', '/contact', '/student-life'];
  for (const path of contentPages) {
    await test(`Content page ${path} loads`, async () => {
      const resp = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (!resp || resp.status() >= 400) throw new Error(`HTTP ${resp?.status()}`);
    });
  }

  // ========== PROJECTS ==========
  await test('Projects page loads', async () => {
    const resp = await page.goto(`${BASE}/projects`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!resp || resp.status() >= 400) throw new Error(`HTTP ${resp?.status()}`);
  });

  // ========== MOBILE MENU ==========
  await test('Mobile menu toggle works', async () => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const toggle = page.locator('.mobile-menu-toggle');
    if (await toggle.count() === 0) throw new Error('No mobile menu toggle');
    await toggle.click();
    const expanded = await toggle.getAttribute('aria-expanded');
    if (expanded !== 'true') throw new Error(`aria-expanded is "${expanded}" after click`);
  });

  // ========== SCROLL ANIMATIONS ==========
  await test('Scroll reveal elements present', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const reveals = await page.locator('.reveal').count();
    if (reveals === 0) throw new Error('No .reveal elements found');
  });

  // ========== VISUAL EDITING COMPONENT ==========
  await test('VisualEditing JS loaded', async () => {
    const html = await page.content();
    const scripts = await page.locator('script[src*="visual-editing"]').count();
    const hasVEScript = scripts > 0 || html.includes('visual-editing');
    if (!hasVEScript) throw new Error('No visual editing script detected');
  });

  // ========== CONSOLE ERRORS ==========
  await test('No critical console errors', async () => {
    const critical = consoleErrors.filter(e =>
      !e.includes('favicon') && !e.includes('404') && !e.includes('net::')
    );
    if (critical.length > 0) throw new Error(`${critical.length} errors: ${critical[0].substring(0, 100)}`);
  });

  // ========== RESULTS ==========
  await browser.close();

  console.log('\n' + results.join('\n'));
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  console.log(`Target: ${BASE}\n`);

  process.exit(failed > 0 ? 1 : 0);
})();
