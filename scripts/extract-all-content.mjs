#!/usr/bin/env node
/**
 * Comprehensive Webflow Content Extraction Script
 *
 * Extracts content from Webflow pages and transforms to Sanity-compatible JSON.
 * Focuses on semantic content, NOT visual styling.
 *
 * Modes:
 *   --info-pages   Extract about, contact, admissions pages
 *   --programs     Extract academic program pages
 *   --faculty      Extract staff/faculty profiles
 *   --all          Run all extractions
 *   --dry-run      Analyze pages without saving
 *
 * Usage: node scripts/extract-all-content.mjs --all
 */

import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import https from 'https'
import http from 'http'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Configuration
const BASE_URL = 'https://www.springfieldcommonwealthacademy.org'
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'webflow-extract')
const IMAGES_DIR = path.join(OUTPUT_DIR, 'images')

// Known page URLs from inventory (grouped by type)
const PAGE_URLS = {
  infoPages: [
    '/about-us-2',
    '/about-us/history',
    '/about-us/vision-mission',
    '/about-us/campus-guardian-alliance',
    '/admissions',
    '/contact',
    '/community',
    '/student-life-3',
    '/alumni-success',
  ],
  programs: [
    '/academics-2',
    '/academics/signature-courses',
    '/academics/special-programs',
    '/academics/future-study-career-development',
    '/athletics-3',
    '/athletics/athletic-philosophy',
    '/athletics/ncaa-pathway',
  ],
  faculty: [
    '/academics/faculty',
  ],
}

// Sanity schema field mappings for validation
const SCHEMA_FIELDS = {
  page: ['title', 'slug', 'body', 'parent', 'seo'],
  program: ['name', 'slug', 'category', 'description', 'image', 'level', 'coach'],
  person: ['name', 'role', 'department', 'bio', 'photo', 'email', 'order'],
}

// Generate unique key for Portable Text
function generateKey() {
  return randomUUID().slice(0, 12)
}

// ============================================================================
// Image Downloading
// ============================================================================

async function downloadImage(url, filename) {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true })
  }

  const filePath = path.join(IMAGES_DIR, filename)

  // Skip if already downloaded
  if (fs.existsSync(filePath)) {
    return { success: true, path: filename, cached: true }
  }

  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http

    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadImage(response.headers.location, filename).then(resolve)
        return
      }

      if (response.statusCode !== 200) {
        resolve({ success: false, error: `HTTP ${response.statusCode}` })
        return
      }

      const writeStream = fs.createWriteStream(filePath)
      response.pipe(writeStream)

      writeStream.on('finish', () => {
        resolve({ success: true, path: filename, cached: false })
      })

      writeStream.on('error', (err) => {
        resolve({ success: false, error: err.message })
      })
    })

    request.on('error', (err) => {
      resolve({ success: false, error: err.message })
    })

    request.setTimeout(30000, () => {
      request.destroy()
      resolve({ success: false, error: 'Timeout' })
    })
  })
}

// ============================================================================
// Content Extraction Helpers
// ============================================================================

/**
 * Extract semantic content from a page element
 * Returns Portable Text-compatible blocks
 */
async function extractSemanticContent(page, selector = 'main, [role="main"], .main-content, article') {
  return await page.evaluate((sel) => {
    const main = document.querySelector(sel) || document.body

    const blocks = []
    const warnings = []

    // Find all semantic block elements
    const blockElements = main.querySelectorAll('h1, h2, h3, h4, h5, h6, p, ul, ol, blockquote')

    for (const el of blockElements) {
      const tagName = el.tagName.toLowerCase()

      // Skip empty elements
      const text = el.textContent?.trim()
      if (!text) continue

      // Skip navigation, header, footer content
      if (el.closest('nav, header, footer, .nav, .header, .footer')) continue

      // Detect Webflow-specific patterns that may not transfer
      const classes = el.className || ''
      if (classes.includes('w-dyn') || classes.includes('w-condition')) {
        warnings.push({
          type: 'WEBFLOW_DYNAMIC_CONTENT',
          element: tagName,
          text: text.slice(0, 100),
        })
      }

      // Check for inline styles that encode semantic meaning
      const style = el.getAttribute('style') || ''
      if (style.includes('display: none') || style.includes('visibility: hidden')) {
        continue // Skip hidden content
      }

      if (style && !style.includes('display: none')) {
        warnings.push({
          type: 'INLINE_STYLES_DETECTED',
          element: tagName,
          style: style.slice(0, 100),
        })
      }

      // Build block
      if (tagName === 'ul' || tagName === 'ol') {
        const listType = tagName === 'ul' ? 'bullet' : 'number'
        const items = el.querySelectorAll('li')

        for (const li of items) {
          const liText = li.textContent?.trim()
          if (liText) {
            blocks.push({
              _type: 'block',
              style: 'normal',
              listItem: listType,
              level: 1,
              text: liText,
            })
          }
        }
      } else {
        let style = 'normal'
        if (/^h([1-6])$/.test(tagName)) {
          style = tagName
        } else if (tagName === 'blockquote') {
          style = 'blockquote'
        }

        blocks.push({
          _type: 'block',
          style,
          text,
        })
      }
    }

    return { blocks, warnings }
  }, selector)
}

/**
 * Extract page metadata (title, description, etc.)
 */
async function extractPageMetadata(page) {
  return await page.evaluate(() => {
    const title = document.title || ''
    const h1 = document.querySelector('h1')?.textContent?.trim() || ''
    const metaDesc = document.querySelector('meta[name="description"]')?.content || ''
    const ogTitle = document.querySelector('meta[property="og:title"]')?.content || ''
    const ogDesc = document.querySelector('meta[property="og:description"]')?.content || ''
    const ogImage = document.querySelector('meta[property="og:image"]')?.content || ''

    return {
      title: h1 || title.split('|')[0].trim(),
      metaTitle: title,
      metaDescription: metaDesc || ogDesc,
      ogImage,
    }
  })
}

/**
 * Extract images from the page
 */
async function extractImages(page) {
  return await page.evaluate(() => {
    const images = []
    const mainContent = document.querySelector('main, [role="main"], .main-content, article') || document.body

    const imgElements = mainContent.querySelectorAll('img')

    for (const img of imgElements) {
      // Skip tiny images (likely icons/decorations)
      const width = img.naturalWidth || img.width || 0
      const height = img.naturalHeight || img.height || 0

      if (width < 50 || height < 50) continue

      // Skip images in nav/footer
      if (img.closest('nav, header, footer, .nav, .header, .footer')) continue

      const src = img.src || img.dataset.src || ''
      if (!src || src.startsWith('data:')) continue

      images.push({
        src,
        alt: img.alt || '',
        width,
        height,
      })
    }

    return images
  })
}

/**
 * Extract faculty/person profiles from a page
 */
async function extractPersonProfiles(page) {
  return await page.evaluate(() => {
    const profiles = []
    const warnings = []

    // Look for common person card patterns
    const selectors = [
      '.faculty-card',
      '.team-member',
      '.staff-card',
      '.person-card',
      '[data-collection="faculty"]',
      '[data-collection="staff"]',
      '.w-dyn-item', // Webflow CMS items
    ]

    let cards = []
    for (const sel of selectors) {
      const found = document.querySelectorAll(sel)
      if (found.length > 0) {
        cards = [...found]
        break
      }
    }

    // If no cards found, try to find profiles by structure
    if (cards.length === 0) {
      // Look for repeating image + text patterns
      const allImages = document.querySelectorAll('main img, .main-content img')
      warnings.push({
        type: 'NO_PERSON_CARDS_DETECTED',
        hint: `Found ${allImages.length} images in main content`,
      })
    }

    for (const card of cards) {
      const img = card.querySelector('img')
      const name = card.querySelector('h2, h3, h4, .name, .title')?.textContent?.trim()
      const role = card.querySelector('.role, .position, .job-title, p:first-of-type')?.textContent?.trim()
      const bio = card.querySelector('.bio, .description, p:last-of-type')?.textContent?.trim()
      const email = card.querySelector('a[href^="mailto:"]')?.href?.replace('mailto:', '')

      if (name) {
        profiles.push({
          name,
          role: role !== name ? role : undefined,
          bio: bio !== role && bio !== name ? bio : undefined,
          email,
          image: img ? {
            src: img.src,
            alt: img.alt || name,
          } : undefined,
        })
      }
    }

    return { profiles, warnings }
  })
}

/**
 * Extract program/academic info from a page
 */
async function extractProgramInfo(page) {
  return await page.evaluate(() => {
    const info = {
      name: '',
      description: '',
      features: [],
      requirements: [],
    }
    const warnings = []

    // Get program name from h1
    info.name = document.querySelector('h1')?.textContent?.trim() || ''

    // Look for description - usually first paragraph after h1
    const mainContent = document.querySelector('main, [role="main"], .main-content') || document.body
    const firstP = mainContent.querySelector('h1 + p, h1 ~ p:first-of-type')
    if (firstP) {
      info.description = firstP.textContent?.trim()
    }

    // Look for feature lists
    const lists = mainContent.querySelectorAll('ul, ol')
    for (const list of lists) {
      const items = [...list.querySelectorAll('li')].map(li => li.textContent?.trim()).filter(Boolean)

      // Try to categorize by preceding heading
      const prevHeading = list.previousElementSibling
      if (prevHeading?.tagName?.match(/^H[2-4]$/)) {
        const headingText = prevHeading.textContent?.toLowerCase() || ''
        if (headingText.includes('feature') || headingText.includes('highlight')) {
          info.features.push(...items)
        } else if (headingText.includes('require') || headingText.includes('prerequisite')) {
          info.requirements.push(...items)
        } else {
          info.features.push(...items) // Default to features
        }
      } else {
        info.features.push(...items)
      }
    }

    return { info, warnings }
  })
}

// ============================================================================
// Content Transformation
// ============================================================================

/**
 * Convert extracted blocks to Sanity Portable Text format
 */
function toPortableText(blocks) {
  return blocks.map(block => ({
    _type: 'block',
    _key: generateKey(),
    style: block.style || 'normal',
    listItem: block.listItem,
    level: block.level,
    children: [{
      _type: 'span',
      _key: generateKey(),
      text: block.text || '',
      marks: [],
    }],
    markDefs: [],
  }))
}

/**
 * Generate a slug from a title
 */
function toSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96)
}

/**
 * Generate a safe filename from a URL
 */
function urlToFilename(url, prefix = '') {
  const urlObj = new URL(url)
  const basename = path.basename(urlObj.pathname)
  const ext = path.extname(basename) || '.jpg'
  const name = basename.replace(ext, '').replace(/[^a-z0-9]/gi, '-').slice(0, 50)
  return `${prefix}${name}${ext}`
}

// ============================================================================
// Extraction Runners
// ============================================================================

async function extractInfoPages(browser, dryRun = false) {
  console.log('\n=== EXTRACTING INFO PAGES ===\n')

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (compatible; SCA-Migration-Bot/1.0)',
  })
  const page = await context.newPage()

  const results = []
  const allWarnings = []

  for (const urlPath of PAGE_URLS.infoPages) {
    const fullUrl = `${BASE_URL}${urlPath}`
    console.log(`\nExtracting: ${urlPath}`)

    try {
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(500)

      // Extract content
      const metadata = await extractPageMetadata(page)
      const { blocks, warnings } = await extractSemanticContent(page)
      const images = await extractImages(page)

      console.log(`  - Title: ${metadata.title}`)
      console.log(`  - Blocks: ${blocks.length}`)
      console.log(`  - Images: ${images.length}`)
      console.log(`  - Warnings: ${warnings.length}`)

      // Download images if not dry run
      let downloadedImages = []
      if (!dryRun && images.length > 0) {
        for (const img of images) {
          const filename = urlToFilename(img.src, `page-${toSlug(metadata.title)}-`)
          const result = await downloadImage(img.src, filename)
          if (result.success) {
            downloadedImages.push({
              ...img,
              local: result.path,
            })
          }
        }
      }

      // Build page document
      const doc = {
        _type: 'page',
        title: metadata.title,
        slug: { current: toSlug(urlPath.split('/').pop() || metadata.title) },
        body: toPortableText(blocks),
        seo: {
          title: metadata.metaTitle,
          description: metadata.metaDescription,
        },
        // Metadata for review
        _extraction: {
          sourceUrl: fullUrl,
          extractedAt: new Date().toISOString(),
          warnings,
          imageCount: images.length,
        },
      }

      // Detect parent page
      const pathParts = urlPath.split('/').filter(Boolean)
      if (pathParts.length > 1) {
        doc._extraction.suggestedParent = pathParts[0]
      }

      results.push(doc)
      allWarnings.push(...warnings.map(w => ({ ...w, page: urlPath })))

    } catch (err) {
      console.log(`  ERROR: ${err.message}`)
      allWarnings.push({
        type: 'EXTRACTION_FAILED',
        page: urlPath,
        error: err.message,
      })
    }
  }

  await context.close()

  // Save results
  if (!dryRun) {
    const outputPath = path.join(OUTPUT_DIR, 'info-pages.json')
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))
    console.log(`\nSaved ${results.length} pages to ${outputPath}`)
  }

  return { results, warnings: allWarnings }
}

async function extractPrograms(browser, dryRun = false) {
  console.log('\n=== EXTRACTING PROGRAMS ===\n')

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (compatible; SCA-Migration-Bot/1.0)',
  })
  const page = await context.newPage()

  const results = []
  const allWarnings = []

  for (const urlPath of PAGE_URLS.programs) {
    const fullUrl = `${BASE_URL}${urlPath}`
    console.log(`\nExtracting: ${urlPath}`)

    try {
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(500)

      // Extract content
      const metadata = await extractPageMetadata(page)
      const { info, warnings: programWarnings } = await extractProgramInfo(page)
      const { blocks, warnings: contentWarnings } = await extractSemanticContent(page)
      const images = await extractImages(page)

      const warnings = [...programWarnings, ...contentWarnings]

      console.log(`  - Name: ${info.name || metadata.title}`)
      console.log(`  - Features: ${info.features.length}`)
      console.log(`  - Blocks: ${blocks.length}`)
      console.log(`  - Images: ${images.length}`)
      console.log(`  - Warnings: ${warnings.length}`)

      // Download featured image if not dry run
      let featuredImage = null
      if (!dryRun && images.length > 0) {
        const img = images[0]
        const filename = urlToFilename(img.src, `program-${toSlug(info.name || metadata.title)}-`)
        const result = await downloadImage(img.src, filename)
        if (result.success) {
          featuredImage = {
            ...img,
            local: result.path,
          }
        }
      }

      // Determine category from URL
      let category = 'academic'
      if (urlPath.includes('athletics') || urlPath.includes('sports')) {
        category = 'athletic'
      } else if (urlPath.includes('arts') || urlPath.includes('music') || urlPath.includes('drama')) {
        category = 'special'
      }

      // Build program document
      const doc = {
        _type: 'program',
        name: info.name || metadata.title,
        slug: { current: toSlug(urlPath.split('/').pop() || info.name || metadata.title) },
        category,
        description: toPortableText(blocks),
        // Metadata for review
        _extraction: {
          sourceUrl: fullUrl,
          extractedAt: new Date().toISOString(),
          warnings,
          features: info.features,
          requirements: info.requirements,
          featuredImage,
        },
      }

      results.push(doc)
      allWarnings.push(...warnings.map(w => ({ ...w, page: urlPath })))

    } catch (err) {
      console.log(`  ERROR: ${err.message}`)
      allWarnings.push({
        type: 'EXTRACTION_FAILED',
        page: urlPath,
        error: err.message,
      })
    }
  }

  await context.close()

  // Save results
  if (!dryRun) {
    const outputPath = path.join(OUTPUT_DIR, 'programs.json')
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))
    console.log(`\nSaved ${results.length} programs to ${outputPath}`)
  }

  return { results, warnings: allWarnings }
}

async function extractFaculty(browser, dryRun = false) {
  console.log('\n=== EXTRACTING FACULTY ===\n')

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (compatible; SCA-Migration-Bot/1.0)',
  })
  const page = await context.newPage()

  const results = []
  const allWarnings = []

  for (const urlPath of PAGE_URLS.faculty) {
    const fullUrl = `${BASE_URL}${urlPath}`
    console.log(`\nExtracting: ${urlPath}`)

    try {
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(1000) // Extra wait for dynamic content

      // Extract profiles
      const { profiles, warnings } = await extractPersonProfiles(page)

      console.log(`  - Profiles found: ${profiles.length}`)
      console.log(`  - Warnings: ${warnings.length}`)

      // Download profile images if not dry run
      for (const profile of profiles) {
        if (!dryRun && profile.image?.src) {
          const filename = urlToFilename(profile.image.src, `faculty-${toSlug(profile.name)}-`)
          const result = await downloadImage(profile.image.src, filename)
          if (result.success) {
            profile.image.local = result.path
          }
        }

        // Build person document
        const doc = {
          _type: 'person',
          name: profile.name,
          role: profile.role,
          bio: profile.bio ? toPortableText([{ text: profile.bio, style: 'normal' }]) : undefined,
          email: profile.email,
          // Metadata for review
          _extraction: {
            sourceUrl: fullUrl,
            extractedAt: new Date().toISOString(),
            image: profile.image,
          },
        }

        results.push(doc)
      }

      allWarnings.push(...warnings.map(w => ({ ...w, page: urlPath })))

    } catch (err) {
      console.log(`  ERROR: ${err.message}`)
      allWarnings.push({
        type: 'EXTRACTION_FAILED',
        page: urlPath,
        error: err.message,
      })
    }
  }

  await context.close()

  // Dedupe by name
  const uniqueResults = []
  const seenNames = new Set()
  for (const result of results) {
    if (!seenNames.has(result.name)) {
      seenNames.add(result.name)
      uniqueResults.push(result)
    }
  }

  // Save results
  if (!dryRun) {
    const outputPath = path.join(OUTPUT_DIR, 'faculty.json')
    fs.writeFileSync(outputPath, JSON.stringify(uniqueResults, null, 2))
    console.log(`\nSaved ${uniqueResults.length} faculty profiles to ${outputPath}`)
  }

  return { results: uniqueResults, warnings: allWarnings }
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Webflow Content Extraction Script

Usage: node scripts/extract-all-content.mjs <mode>

Modes:
  --info-pages   Extract about, contact, admissions pages
  --programs     Extract academic program pages
  --faculty      Extract staff/faculty profiles
  --all          Run all extractions
  --dry-run      Analyze pages without saving (combine with other modes)

Examples:
  node scripts/extract-all-content.mjs --all
  node scripts/extract-all-content.mjs --info-pages --dry-run
  node scripts/extract-all-content.mjs --programs --faculty
`)
    process.exit(0)
  }

  const dryRun = args.includes('--dry-run')
  const runAll = args.includes('--all')
  const runInfoPages = runAll || args.includes('--info-pages')
  const runPrograms = runAll || args.includes('--programs')
  const runFaculty = runAll || args.includes('--faculty')

  console.log('='.repeat(60))
  console.log('WEBFLOW CONTENT EXTRACTION')
  console.log('='.repeat(60))
  console.log(`Target: ${BASE_URL}`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'EXTRACT'}`)
  console.log(`Output: ${OUTPUT_DIR}`)

  // Ensure output directory exists
  if (!dryRun && !fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const browser = await chromium.launch({ headless: true })
  const allWarnings = []

  try {
    if (runInfoPages) {
      const { warnings } = await extractInfoPages(browser, dryRun)
      allWarnings.push(...warnings)
    }

    if (runPrograms) {
      const { warnings } = await extractPrograms(browser, dryRun)
      allWarnings.push(...warnings)
    }

    if (runFaculty) {
      const { warnings } = await extractFaculty(browser, dryRun)
      allWarnings.push(...warnings)
    }

    // Save warnings
    if (!dryRun && allWarnings.length > 0) {
      const warningsPath = path.join(OUTPUT_DIR, 'extraction-warnings.json')
      fs.writeFileSync(warningsPath, JSON.stringify(allWarnings, null, 2))
      console.log(`\nSaved ${allWarnings.length} warnings to ${warningsPath}`)
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('EXTRACTION COMPLETE')
    console.log('='.repeat(60))
    console.log(`Total warnings: ${allWarnings.length}`)

    // Group warnings by type
    const warningsByType = {}
    for (const w of allWarnings) {
      warningsByType[w.type] = (warningsByType[w.type] || 0) + 1
    }

    if (Object.keys(warningsByType).length > 0) {
      console.log('\nWarnings by type:')
      for (const [type, count] of Object.entries(warningsByType).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${type}: ${count}`)
      }
    }

    console.log('\nSchema compatibility notes:')
    console.log('  - WEBFLOW_DYNAMIC_CONTENT: Content may rely on Webflow CMS features')
    console.log('  - INLINE_STYLES_DETECTED: Visual styling will be stripped')
    console.log('  - NO_PERSON_CARDS_DETECTED: Manual extraction may be needed')
    console.log('  - EXTRACTION_FAILED: Page could not be loaded/parsed')

  } finally {
    await browser.close()
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
