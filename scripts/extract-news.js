/**
 * Extract News Articles from Webflow
 *
 * Extracts full content and downloads images from each article.
 * Run via: cd [playwright-skill-dir] && node run.js [this-script]
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const BASE_URL = 'https://www.springfieldcommonwealthacademy.org';
const OUTPUT_DIR = path.join(__dirname, '../data/webflow-extract');
const IMAGES_DIR = path.join(OUTPUT_DIR, 'images');

// Article URLs from inventory
const ARTICLE_URLS = [
  '/article1', '/article2', '/article3', '/article4', '/article5', '/article6',
  '/article7', '/article8', '/article9', '/article10', '/article11', '/article12'
];

// Track downloaded images to avoid duplicates
const downloadedImages = new Map(); // url -> filename

async function downloadImage(url, suggestedFilename) {
  if (downloadedImages.has(url)) {
    return downloadedImages.get(url);
  }

  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const filepath = path.join(IMAGES_DIR, suggestedFilename);

    // Skip if already downloaded
    if (fs.existsSync(filepath)) {
      downloadedImages.set(url, suggestedFilename);
      resolve(suggestedFilename);
      return;
    }

    const file = fs.createWriteStream(filepath);
    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(filepath);
        downloadImage(response.headers.location, suggestedFilename).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(filepath);
        console.error(`  HTTP ${response.statusCode} for ${url}`);
        resolve(null);
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        downloadedImages.set(url, suggestedFilename);
        resolve(suggestedFilename);
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      console.error(`  Failed to download ${url}: ${err.message}`);
      resolve(null);
    });
  });
}

function sanitizeFilename(url, articleSlug, index) {
  // Create a clean filename based on article and index
  const urlPath = new URL(url).pathname;
  const ext = path.extname(urlPath).split('?')[0] || '.jpg';
  return `${articleSlug}-img${index}${ext}`;
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

async function extractArticle(page, articlePath) {
  const url = `${BASE_URL}${articlePath}`;
  console.log(`\nExtracting: ${url}`);

  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000); // Wait for lazy content

  const article = await page.evaluate(() => {
    // Get headline from h1
    const h1 = document.querySelector('h1');
    const headline = h1?.textContent?.trim() || '';

    // Get meta description
    const metaDesc = document.querySelector('meta[name="description"]')?.content || '';

    // Find the rich text content block (Webflow uses w-richtext class)
    const richTextBlock = document.querySelector('.w-richtext') ||
                          document.querySelector('.rich-text-block') ||
                          document.querySelector('[class*="rich-text"]');

    const bodyContent = [];
    if (richTextBlock) {
      // Get all content elements from rich text
      const elements = richTextBlock.querySelectorAll('p, h2, h3, h4, h5, h6, blockquote, ul, ol, figure');
      elements.forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length > 5) {
          bodyContent.push({
            type: el.tagName.toLowerCase(),
            text: text
          });
        }
      });
    }

    // Get the full rich text HTML for potential conversion later
    const bodyHtml = richTextBlock?.innerHTML || '';

    // Find header/hero section for featured image
    const headerSection = document.querySelector('[class*="header5"]') ||
                          document.querySelector('[class*="hero"]') ||
                          document.querySelector('[class*="article-header"]');

    // Collect all meaningful content images
    // Look for images > 200px that aren't navigation/icons
    const images = [];
    const allImages = document.querySelectorAll('img');

    allImages.forEach(img => {
      const src = img.src;
      const width = img.naturalWidth || img.width || 0;
      const className = img.className || '';

      // Filter: must be substantial size, not navigation/icon
      const isContentImage = width > 200 &&
                             !className.includes('navbar') &&
                             !className.includes('footer') &&
                             !className.includes('dropdown') &&
                             !className.includes('logo') &&
                             !src.includes('arrow') &&
                             !src.includes('icon');

      if (src && isContentImage) {
        images.push({
          src: src,
          alt: img.alt || '',
          width: width,
          height: img.naturalHeight || img.height || 0,
          className: className
        });
      }
    });

    // Try to find a date
    let date = null;
    const dateEl = document.querySelector('[class*="date"]') ||
                   document.querySelector('time');
    if (dateEl) {
      const dateText = dateEl.textContent?.trim();
      const parsed = new Date(dateText);
      if (!isNaN(parsed.getTime())) {
        date = parsed.toISOString();
      }
    }

    return {
      headline,
      metaDesc,
      date,
      bodyContent,
      bodyHtml,
      images
    };
  });

  // Generate slug from headline
  const slug = generateSlug(article.headline);

  // Download images
  const downloadedImageFiles = [];
  for (let i = 0; i < article.images.length; i++) {
    const img = article.images[i];
    const filename = sanitizeFilename(img.src, slug, i + 1);
    console.log(`  Downloading: ${filename}`);
    const result = await downloadImage(img.src, filename);
    if (result) {
      downloadedImageFiles.push({
        original: img.src,
        local: result,
        alt: img.alt,
        width: img.width,
        height: img.height
      });
    }
  }

  return {
    sourceUrl: url,
    sourcePath: articlePath,
    title: article.headline,
    slug: slug,
    date: article.date,
    summary: article.metaDesc,
    bodyContent: article.bodyContent,
    bodyHtml: article.bodyHtml,
    images: downloadedImageFiles,
    extractedAt: new Date().toISOString()
  };
}

async function main() {
  console.log('=== News Article Extraction ===\n');

  // Create output directories
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (compatible; SCA-Migration-Bot/1.0)',
  });
  const page = await context.newPage();

  const articles = [];

  try {
    for (const articlePath of ARTICLE_URLS) {
      const article = await extractArticle(page, articlePath);
      articles.push(article);
      console.log(`  Title: ${article.title}`);
      console.log(`  Content blocks: ${article.bodyContent.length}`);
      console.log(`  Images: ${article.images.length}`);
    }

    // Save extracted data
    const outputPath = path.join(OUTPUT_DIR, 'news-articles.json');
    fs.writeFileSync(outputPath, JSON.stringify(articles, null, 2));
    console.log(`\n✅ Extracted ${articles.length} articles`);
    console.log(`📁 Data saved to: ${outputPath}`);
    console.log(`🖼️  Images saved to: ${IMAGES_DIR}`);

    // Summary
    const totalImages = articles.reduce((sum, a) => sum + a.images.length, 0);
    const totalBlocks = articles.reduce((sum, a) => sum + a.bodyContent.length, 0);
    console.log(`\n=== Summary ===`);
    console.log(`Articles: ${articles.length}`);
    console.log(`Total content blocks: ${totalBlocks}`);
    console.log(`Total images: ${totalImages}`);
    console.log(`Unique images downloaded: ${downloadedImages.size}`);

    // List downloaded files
    const imageFiles = fs.readdirSync(IMAGES_DIR);
    console.log(`\nDownloaded image files: ${imageFiles.length}`);

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
