/**
 * Webflow Site Inventory Script
 *
 * Crawls the Webflow site and creates an inventory of all pages and content.
 * Run: node scripts/webflow-inventory.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.springfieldcommonwealthacademy.org';
const OUTPUT_DIR = path.join(__dirname, '../data/webflow-inventory');

// Track visited URLs to avoid duplicates
const visited = new Set();
const inventory = {
  pages: [],
  bySection: {},
  assets: {
    images: new Set(),
    pdfs: new Set(),
  },
  timestamp: new Date().toISOString(),
};

async function crawlPage(page, url, depth = 0) {
  // Normalize URL
  const normalizedUrl = url.split('#')[0].split('?')[0].replace(/\/$/, '');

  // Skip if already visited, external, or too deep
  if (visited.has(normalizedUrl)) return;
  if (!normalizedUrl.startsWith(BASE_URL)) return;
  if (depth > 3) return;

  visited.add(normalizedUrl);

  console.log(`[${visited.size}] Crawling: ${normalizedUrl}`);

  try {
    await page.goto(normalizedUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(500);

    // Extract page info
    const pageInfo = await page.evaluate((baseUrl) => {
      const title = document.title || '';
      const h1 = document.querySelector('h1')?.textContent?.trim() || '';
      const metaDesc = document.querySelector('meta[name="description"]')?.content || '';

      // Detect page type based on URL and content
      const path = window.location.pathname;
      let pageType = 'static';

      if (path.includes('/news') || path.includes('/blog') || path.includes('/article')) {
        pageType = 'news';
      } else if (path.includes('/staff') || path.includes('/faculty') || path.includes('/team')) {
        pageType = 'person';
      } else if (path.includes('/program') || path.includes('/academic')) {
        pageType = 'program';
      } else if (path.includes('/event')) {
        pageType = 'event';
      } else if (path.includes('/gallery') || path.includes('/photo')) {
        pageType = 'gallery';
      } else if (path.includes('/about') || path.includes('/contact') || path.includes('/admission')) {
        pageType = 'info';
      }

      // Check for CMS indicators (Webflow adds specific classes/attributes)
      const hasCmsContent = document.querySelector('[class*="w-dyn"]') !== null;

      // Get main content structure
      const mainContent = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
      const contentLength = mainContent?.textContent?.length || 0;

      // Count images
      const images = [...document.querySelectorAll('img')].map(img => img.src).filter(src => src);

      // Find all internal links
      const links = [...document.querySelectorAll('a[href]')]
        .map(a => a.href)
        .filter(href => href.startsWith(baseUrl) || href.startsWith('/'));

      // Find PDFs and documents
      const pdfs = [...document.querySelectorAll('a[href$=".pdf"]')].map(a => a.href);

      return {
        url: window.location.href,
        path: window.location.pathname,
        title,
        h1,
        metaDesc,
        pageType,
        hasCmsContent,
        contentLength,
        imageCount: images.length,
        images: images.slice(0, 10), // First 10 images
        links,
        pdfs,
      };
    }, BASE_URL);

    // Categorize by section
    const section = pageInfo.path.split('/')[1] || 'home';
    if (!inventory.bySection[section]) {
      inventory.bySection[section] = [];
    }
    inventory.bySection[section].push(pageInfo.path);

    // Track assets
    pageInfo.images.forEach(img => inventory.assets.images.add(img));
    pageInfo.pdfs.forEach(pdf => inventory.assets.pdfs.add(pdf));

    // Store page info (without links to keep it clean)
    const { links, ...pageData } = pageInfo;
    inventory.pages.push(pageData);

    // Recursively crawl linked pages
    for (const link of pageInfo.links) {
      await crawlPage(page, link, depth + 1);
    }

  } catch (error) {
    console.error(`  Error crawling ${normalizedUrl}: ${error.message}`);
    inventory.pages.push({
      url: normalizedUrl,
      error: error.message,
    });
  }
}

async function main() {
  console.log('=== Webflow Site Inventory ===\n');
  console.log(`Target: ${BASE_URL}\n`);

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (compatible; SCA-Migration-Bot/1.0)',
  });
  const page = await context.newPage();

  try {
    // Start crawl from homepage
    await crawlPage(page, BASE_URL, 0);

    // Convert Sets to Arrays for JSON
    inventory.assets.images = [...inventory.assets.images];
    inventory.assets.pdfs = [...inventory.assets.pdfs];

    // Generate summary
    const summary = {
      totalPages: inventory.pages.length,
      byType: {},
      bySection: {},
      cmsPages: inventory.pages.filter(p => p.hasCmsContent).length,
      staticPages: inventory.pages.filter(p => !p.hasCmsContent && !p.error).length,
      errors: inventory.pages.filter(p => p.error).length,
      totalImages: inventory.assets.images.length,
      totalPdfs: inventory.assets.pdfs.length,
    };

    // Count by type
    inventory.pages.forEach(p => {
      if (p.pageType) {
        summary.byType[p.pageType] = (summary.byType[p.pageType] || 0) + 1;
      }
    });

    // Count by section
    Object.keys(inventory.bySection).forEach(section => {
      summary.bySection[section] = inventory.bySection[section].length;
    });

    inventory.summary = summary;

    // Save full inventory
    const inventoryPath = path.join(OUTPUT_DIR, 'inventory.json');
    fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));
    console.log(`\nInventory saved to: ${inventoryPath}`);

    // Print summary
    console.log('\n=== Summary ===\n');
    console.log(`Total pages found: ${summary.totalPages}`);
    console.log(`CMS-driven pages: ${summary.cmsPages}`);
    console.log(`Static pages: ${summary.staticPages}`);
    console.log(`Errors: ${summary.errors}`);
    console.log(`\nBy section:`);
    Object.entries(summary.bySection)
      .sort((a, b) => b[1] - a[1])
      .forEach(([section, count]) => {
        console.log(`  ${section || 'home'}: ${count}`);
      });
    console.log(`\nBy type:`);
    Object.entries(summary.byType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    console.log(`\nAssets:`);
    console.log(`  Images: ${summary.totalImages}`);
    console.log(`  PDFs: ${summary.totalPdfs}`);

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
