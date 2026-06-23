/**
 * Inspect Article Structure
 * Quick diagnostic to find where the real content lives
 */

const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://www.springfieldcommonwealthacademy.org/article1', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  // Wait for any lazy content
  await page.waitForTimeout(3000);

  const structure = await page.evaluate(() => {
    // Get all major sections
    const sections = document.querySelectorAll('section, [class*="section"], div[class*="w-"]');
    const sectionInfo = [];

    sections.forEach((s, i) => {
      const className = s.className;
      const text = s.textContent?.substring(0, 100).trim();
      const hasImages = s.querySelectorAll('img').length;
      const hasParagraphs = s.querySelectorAll('p').length;

      if (text && text.length > 20) {
        sectionInfo.push({
          index: i,
          tag: s.tagName,
          className: className.substring(0, 100),
          textPreview: text,
          images: hasImages,
          paragraphs: hasParagraphs
        });
      }
    });

    // Also check for article-specific containers
    const articleContainers = document.querySelectorAll(
      '[class*="article"], [class*="post"], [class*="blog"], [class*="content"], [class*="rich-text"]'
    );

    const articleInfo = [];
    articleContainers.forEach(c => {
      articleInfo.push({
        className: c.className,
        textLength: c.textContent?.length || 0,
        images: c.querySelectorAll('img').length
      });
    });

    // Get all images on the page
    const allImages = [...document.querySelectorAll('img')].map(img => ({
      src: img.src,
      className: img.className,
      width: img.width,
      alt: img.alt?.substring(0, 50)
    }));

    return {
      title: document.title,
      h1: document.querySelector('h1')?.textContent,
      sectionCount: sections.length,
      sections: sectionInfo.slice(0, 20), // First 20
      articleContainers: articleInfo,
      allImages: allImages.slice(0, 20),
      bodyClasses: document.body.className
    };
  });

  console.log('=== Article Structure Analysis ===\n');
  console.log(`Title: ${structure.title}`);
  console.log(`H1: ${structure.h1}`);
  console.log(`Body classes: ${structure.bodyClasses}`);
  console.log(`\n--- Article-specific containers (${structure.articleContainers.length}) ---`);
  structure.articleContainers.forEach(c => {
    console.log(`  ${c.className.substring(0, 60)} | text: ${c.textLength} chars | images: ${c.images}`);
  });

  console.log(`\n--- All images (${structure.allImages.length}) ---`);
  structure.allImages.forEach(img => {
    console.log(`  ${img.width}px | ${img.className.substring(0, 30)} | ${img.src.substring(0, 80)}`);
  });

  console.log(`\n--- Sections with content (showing first 10) ---`);
  structure.sections.slice(0, 10).forEach(s => {
    console.log(`  [${s.tag}] ${s.className.substring(0, 40)} | p:${s.paragraphs} img:${s.images}`);
    console.log(`    "${s.textPreview.substring(0, 60)}..."`);
  });

  await browser.close();
}

main().catch(console.error);
