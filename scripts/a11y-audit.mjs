/**
 * Accessibility Audit Script
 * Uses Playwright + axe-core to audit pages for WCAG AA compliance.
 */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  { url: 'http://localhost:4321/', name: 'Home Page' },
  { url: 'http://localhost:4321/demos/', name: 'Demos Page' },
];

async function auditPage(page, pageInfo, screenshotDir) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`AUDITING: ${pageInfo.name} (${pageInfo.url})`);
  console.log('='.repeat(70));

  await page.goto(pageInfo.url, { waitUntil: 'networkidle', timeout: 30000 });

  // Take screenshot
  const screenshotPath = `${screenshotDir}/${pageInfo.name.replace(/\s+/g, '-').toLowerCase()}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved: ${screenshotPath}`);

  // Run full axe-core audit
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();

  // Report violations
  console.log(`\n--- VIOLATIONS (${results.violations.length}) ---`);
  if (results.violations.length === 0) {
    console.log('  No violations found!');
  }
  for (const v of results.violations) {
    console.log(`\n  [${v.impact?.toUpperCase()}] ${v.id}: ${v.description}`);
    console.log(`    Help: ${v.helpUrl}`);
    console.log(`    WCAG: ${v.tags.filter(t => t.startsWith('wcag')).join(', ')}`);
    console.log(`    Affected nodes (${v.nodes.length}):`);
    for (const node of v.nodes.slice(0, 5)) {
      console.log(`      - ${node.html.substring(0, 120)}`);
      console.log(`        ${node.failureSummary?.split('\n')[0] || ''}`);
    }
    if (v.nodes.length > 5) {
      console.log(`      ... and ${v.nodes.length - 5} more nodes`);
    }
  }

  // Report incomplete checks
  console.log(`\n--- INCOMPLETE CHECKS (${results.incomplete.length}) ---`);
  for (const inc of results.incomplete) {
    console.log(`  [${inc.impact?.toUpperCase()}] ${inc.id}: ${inc.description}`);
    console.log(`    Nodes: ${inc.nodes.length}`);
    for (const node of inc.nodes.slice(0, 3)) {
      console.log(`      - ${node.html.substring(0, 120)}`);
    }
  }

  // Report passes
  console.log(`\n--- PASSES (${results.passes.length}) ---`);
  for (const p of results.passes) {
    console.log(`  [PASS] ${p.id}: ${p.description} (${p.nodes.length} nodes)`);
  }

  // Report inapplicable
  console.log(`\n--- INAPPLICABLE (${results.inapplicable.length}) ---`);
  console.log(`  ${results.inapplicable.map(i => i.id).join(', ')}`);

  // Custom checks beyond axe-core

  // 1. Landmark regions check
  console.log(`\n--- LANDMARK REGIONS CHECK ---`);
  const landmarks = await page.evaluate(() => {
    const roles = ['banner', 'main', 'contentinfo', 'navigation', 'complementary', 'search'];
    const result = {};
    for (const role of roles) {
      const byRole = document.querySelectorAll(`[role="${role}"]`);
      const byTag = {
        banner: document.querySelectorAll('header'),
        main: document.querySelectorAll('main'),
        contentinfo: document.querySelectorAll('footer'),
        navigation: document.querySelectorAll('nav'),
        complementary: document.querySelectorAll('aside'),
        search: document.querySelectorAll('search, [role="search"]'),
      };
      result[role] = {
        byRole: byRole.length,
        byTag: byTag[role]?.length || 0,
        total: new Set([...byRole, ...(byTag[role] || [])]).size,
      };
    }
    return result;
  });
  for (const [role, counts] of Object.entries(landmarks)) {
    const status = counts.total > 0 ? 'FOUND' : 'MISSING';
    console.log(`  [${status}] ${role}: ${counts.total} (role attr: ${counts.byRole}, semantic tag: ${counts.byTag})`);
  }

  // 2. Heading hierarchy check
  console.log(`\n--- HEADING HIERARCHY CHECK ---`);
  const headings = await page.evaluate(() => {
    const hs = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    return Array.from(hs).map(h => ({
      level: parseInt(h.tagName[1]),
      text: h.textContent.trim().substring(0, 80),
      visible: h.offsetParent !== null || h.offsetWidth > 0 || h.offsetHeight > 0,
    }));
  });
  let prevLevel = 0;
  let hierarchyIssues = [];
  for (const h of headings) {
    const indent = '  '.repeat(h.level);
    const skipWarning = (h.level > prevLevel + 1 && prevLevel > 0) ? ' *** SKIPPED LEVEL ***' : '';
    if (skipWarning) hierarchyIssues.push(`h${prevLevel} -> h${h.level}`);
    console.log(`  ${indent}h${h.level}: "${h.text}"${h.visible ? '' : ' (hidden)'}${skipWarning}`);
    prevLevel = h.level;
  }
  if (hierarchyIssues.length > 0) {
    console.log(`  WARNING: Skipped heading levels: ${hierarchyIssues.join(', ')}`);
  } else {
    console.log(`  Heading hierarchy is valid.`);
  }

  // 3. Image alt text check
  console.log(`\n--- IMAGE ALT TEXT CHECK ---`);
  const images = await page.evaluate(() => {
    const imgs = document.querySelectorAll('img');
    return Array.from(imgs).map(img => ({
      src: img.src.substring(0, 80),
      alt: img.alt,
      hasAlt: img.hasAttribute('alt'),
      role: img.getAttribute('role'),
      ariaHidden: img.getAttribute('aria-hidden'),
      width: img.naturalWidth,
      height: img.naturalHeight,
    }));
  });
  let missingAlt = 0;
  for (const img of images) {
    const status = img.hasAlt ? (img.alt ? 'HAS ALT' : 'DECORATIVE (empty alt)') : 'MISSING ALT';
    if (!img.hasAlt && img.role !== 'presentation' && img.ariaHidden !== 'true') {
      missingAlt++;
    }
    console.log(`  [${status}] ${img.src}`);
    if (img.alt) console.log(`    alt="${img.alt}"`);
  }
  console.log(`  Total images: ${images.length}, Missing alt: ${missingAlt}`);

  // 4. Focus management — check skip link
  console.log(`\n--- SKIP LINK CHECK ---`);
  const skipLink = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href^="#"]');
    for (const link of links) {
      const text = link.textContent.trim().toLowerCase();
      if (text.includes('skip') || text.includes('main content') || text.includes('jump to')) {
        const style = window.getComputedStyle(link);
        return {
          found: true,
          text: link.textContent.trim(),
          href: link.getAttribute('href'),
          visible: style.display !== 'none',
          position: style.position,
          clip: style.clip,
        };
      }
    }
    return { found: false };
  });
  if (skipLink.found) {
    console.log(`  [FOUND] Skip link: "${skipLink.text}" -> ${skipLink.href}`);
    console.log(`    Visible: ${skipLink.visible}, Position: ${skipLink.position}`);
  } else {
    console.log(`  [MISSING] No skip link found`);
  }

  // 5. Color contrast — manual spot check via computed styles
  console.log(`\n--- COLOR CONTRAST SPOT CHECK ---`);
  const contrastData = await page.evaluate(() => {
    const elements = document.querySelectorAll('p, a, h1, h2, h3, h4, h5, h6, span, li, button, label');
    const samples = [];
    for (const el of Array.from(elements).slice(0, 20)) {
      const style = window.getComputedStyle(el);
      samples.push({
        tag: el.tagName.toLowerCase(),
        text: el.textContent.trim().substring(0, 40),
        color: style.color,
        bg: style.backgroundColor,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
      });
    }
    return samples;
  });
  for (const s of contrastData.slice(0, 10)) {
    console.log(`  ${s.tag}: color=${s.color} bg=${s.bg} size=${s.fontSize} weight=${s.fontWeight} "${s.text}"`);
  }

  // 6. ARIA attributes check
  console.log(`\n--- ARIA ATTRIBUTES CHECK ---`);
  const ariaData = await page.evaluate(() => {
    const allElements = document.querySelectorAll('*');
    const ariaElements = [];
    for (const el of allElements) {
      const attrs = Array.from(el.attributes).filter(a => a.name.startsWith('aria-') || a.name === 'role');
      if (attrs.length > 0) {
        ariaElements.push({
          tag: el.tagName.toLowerCase(),
          attrs: attrs.map(a => `${a.name}="${a.value}"`).join(', '),
          text: el.textContent.trim().substring(0, 40),
        });
      }
    }
    return ariaElements;
  });
  console.log(`  Elements with ARIA attributes: ${ariaData.length}`);
  for (const el of ariaData.slice(0, 20)) {
    console.log(`  <${el.tag} ${el.attrs}> "${el.text}"`);
  }
  if (ariaData.length > 20) {
    console.log(`  ... and ${ariaData.length - 20} more`);
  }

  // 7. Tab order / focusable elements
  console.log(`\n--- FOCUSABLE ELEMENTS CHECK ---`);
  const focusable = await page.evaluate(() => {
    const selector = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const els = document.querySelectorAll(selector);
    return Array.from(els).map(el => ({
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().substring(0, 50),
      tabindex: el.getAttribute('tabindex'),
      href: el.getAttribute('href')?.substring(0, 60) || null,
      type: el.getAttribute('type'),
      visible: el.offsetParent !== null,
    }));
  });
  console.log(`  Total focusable elements: ${focusable.length}`);
  for (const el of focusable) {
    const vis = el.visible ? '' : ' (hidden)';
    const tab = el.tabindex ? ` tabindex=${el.tabindex}` : '';
    console.log(`  <${el.tag}${tab}${vis}> "${el.text}" ${el.href ? `href="${el.href}"` : ''}`);
  }

  // Summary
  const summary = {
    page: pageInfo.name,
    url: pageInfo.url,
    violations: results.violations.length,
    violationsByImpact: {
      critical: results.violations.filter(v => v.impact === 'critical').length,
      serious: results.violations.filter(v => v.impact === 'serious').length,
      moderate: results.violations.filter(v => v.impact === 'moderate').length,
      minor: results.violations.filter(v => v.impact === 'minor').length,
    },
    incomplete: results.incomplete.length,
    passes: results.passes.length,
    inapplicable: results.inapplicable.length,
    headingIssues: hierarchyIssues.length,
    missingAltImages: missingAlt,
    hasSkipLink: skipLink.found,
    totalFocusable: focusable.length,
    totalAriaElements: ariaData.length,
  };

  console.log(`\n--- SUMMARY ---`);
  console.log(JSON.stringify(summary, null, 2));

  return summary;
}

async function main() {
  const screenshotDir = 'C:/Users/Guest1/dev-sandbox/sca-website/test-results';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const summaries = [];

  for (const pageInfo of PAGES) {
    try {
      const summary = await auditPage(page, pageInfo, screenshotDir);
      summaries.push(summary);
    } catch (err) {
      console.error(`Error auditing ${pageInfo.name}: ${err.message}`);
      summaries.push({ page: pageInfo.name, error: err.message });
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('OVERALL AUDIT SUMMARY');
  console.log('='.repeat(70));
  console.log(JSON.stringify(summaries, null, 2));

  await browser.close();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
