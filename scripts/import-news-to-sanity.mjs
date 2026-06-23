#!/usr/bin/env node
/**
 * News Import Script: Webflow → Sanity
 *
 * Modes:
 *   --dry-run      Validate transformations, show per-article summary
 *   --images-only  Upload images, save refs to image-refs.json
 *   --create       Create documents (requires prior image upload)
 *
 * Requires SANITY_API_TOKEN environment variable for write operations.
 */

import { createClient } from '@sanity/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { htmlToPortableText } from './lib/html-to-portable-text.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Configuration
const SANITY_PROJECT_ID = 'wesg5rw8'
const SANITY_DATASET = 'production'
const SANITY_API_VERSION = '2024-01-01'
const SENTINEL_DATE = '2024-01-01T00:00:00Z'
const MAX_SLUG_LENGTH = 96

// Paths
const DATA_DIR = path.join(__dirname, '..', 'data', 'webflow-extract')
const ARTICLES_FILE = path.join(DATA_DIR, 'news-articles.json')
const IMAGES_DIR = path.join(DATA_DIR, 'images')
const IMAGE_REFS_FILE = path.join(DATA_DIR, 'image-refs.json')

// Image reconnaissance thresholds
const IMAGE_TINY_THRESHOLD = 100 // pixels on smallest side
const IMAGE_EXTREME_ASPECT_MIN = 0.3 // very tall
const IMAGE_EXTREME_ASPECT_MAX = 3.0 // very wide
const IMAGE_LARGE_FILE_THRESHOLD = 5 * 1024 * 1024 // 5MB

// Wrong alt text pattern (detected in extraction)
const WRONG_ALT_TEXT = 'Two women seated on gray armchairs facing the camera in a modern studio setting'

// ============================================================================
// Date Extraction
// ============================================================================

/**
 * Extract date from article body text using priority order.
 * Returns { date: string|null, derivation: string }
 */
function extractDate(article) {
  const bodyText = article.bodyContent.map(b => b.text || '').join(' ')
  const titleText = article.title || ''
  const fullText = `${titleText} ${bodyText}`

  // Priority 1: ISO format (YYYY-MM-DD)
  const isoMatch = fullText.match(/\b(202[4-6])-(\d{2})-(\d{2})\b/)
  if (isoMatch) {
    return { date: `${isoMatch[0]}T00:00:00Z`, derivation: 'ISO_FORMAT' }
  }

  // Priority 2: US numeric format (MM/DD/YYYY or M/D/YYYY)
  const usMatch = fullText.match(/\b(\d{1,2})\/(\d{1,2})\/(202[4-6])\b/)
  if (usMatch) {
    const month = usMatch[1].padStart(2, '0')
    const day = usMatch[2].padStart(2, '0')
    return { date: `${usMatch[3]}-${month}-${day}T00:00:00Z`, derivation: 'US_NUMERIC' }
  }

  // Priority 3: Month + day + year ("November 10, 2025" or "November 10–21, 2025")
  const monthNames = 'January|February|March|April|May|June|July|August|September|October|November|December'
  const monthDayYearMatch = fullText.match(new RegExp(`(${monthNames})\\s+(\\d{1,2})(?:[–-]\\d{1,2})?,?\\s*(202[4-6])`, 'i'))
  if (monthDayYearMatch) {
    const monthNum = getMonthNumber(monthDayYearMatch[1])
    const day = monthDayYearMatch[2].padStart(2, '0')
    return { date: `${monthDayYearMatch[3]}-${monthNum}-${day}T00:00:00Z`, derivation: 'MONTH_DAY_YEAR' }
  }

  // Priority 4: Month + day without year (assume 2025 for school year context)
  const monthDayMatch = fullText.match(new RegExp(`(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:[,]|\\b)`, 'i'))
  if (monthDayMatch) {
    const monthNum = getMonthNumber(monthDayMatch[1])
    const day = monthDayMatch[2].padStart(2, '0')
    // Infer year: Nov-Dec = 2025, Jan-Feb = 2026 (school year logic)
    const monthInt = parseInt(monthNum)
    const year = monthInt >= 9 ? '2025' : '2026'
    return { date: `${year}-${monthNum}-${day}T00:00:00Z`, derivation: 'MONTH_DAY_INFERRED_YEAR' }
  }

  // Priority 5: "12/12" in title (article 10 pattern)
  const titleDateMatch = titleText.match(/(\d{1,2})\/(\d{1,2})/)
  if (titleDateMatch) {
    const month = titleDateMatch[1].padStart(2, '0')
    const day = titleDateMatch[2].padStart(2, '0')
    const year = parseInt(month) >= 9 ? '2025' : '2026'
    return { date: `${year}-${month}-${day}T00:00:00Z`, derivation: 'TITLE_DATE' }
  }

  // Priority 6: Season/holiday inference
  if (/thanksgiving/i.test(fullText)) {
    // US Thanksgiving 2025 was Nov 27
    return { date: '2025-11-27T00:00:00Z', derivation: 'DERIVED_FROM_HOLIDAY_THANKSGIVING' }
  }
  if (/christmas eve/i.test(fullText)) {
    return { date: '2025-12-24T00:00:00Z', derivation: 'DERIVED_FROM_HOLIDAY_CHRISTMAS_EVE' }
  }
  if (/christmas/i.test(fullText) && !/christmas eve/i.test(fullText)) {
    return { date: '2025-12-25T00:00:00Z', derivation: 'DERIVED_FROM_HOLIDAY_CHRISTMAS' }
  }

  // Fallback: sentinel
  return { date: SENTINEL_DATE, derivation: 'SENTINEL_PLACEHOLDER' }
}

function getMonthNumber(monthName) {
  const months = {
    january: '01', february: '02', march: '03', april: '04',
    may: '05', june: '06', july: '07', august: '08',
    september: '09', october: '10', november: '11', december: '12'
  }
  return months[monthName.toLowerCase()] || '01'
}

// ============================================================================
// Slug Handling
// ============================================================================

/**
 * Ensure slug is unique, truncated, and collision-free.
 */
async function resolveSlug(client, baseSlug, existingSlugs, dryRun = true) {
  // Truncate to max length
  let slug = baseSlug.slice(0, MAX_SLUG_LENGTH)

  // Remove trailing hyphens from truncation
  slug = slug.replace(/-+$/, '')

  let candidate = slug
  let suffix = 2

  // Check against batch and Sanity
  while (existingSlugs.has(candidate) || (!dryRun && await slugExistsInSanity(client, candidate))) {
    candidate = `${slug.slice(0, MAX_SLUG_LENGTH - 3)}-${suffix}`
    suffix++
  }

  return candidate
}

async function slugExistsInSanity(client, slug) {
  const existing = await client.fetch(
    `*[_type == "news" && slug.current == $slug][0]._id`,
    { slug }
  )
  return !!existing
}

// ============================================================================
// Image Handling
// ============================================================================

function getImageMetadata(imagePath) {
  try {
    const stats = fs.statSync(imagePath)
    const fileSizeBytes = stats.size
    const ext = path.extname(imagePath).toLowerCase().slice(1)

    // Note: width/height already in extracted data, but validate file exists
    return {
      fileSizeBytes,
      format: ext || 'unknown',
      exists: true
    }
  } catch (err) {
    return {
      fileSizeBytes: 0,
      format: 'unknown',
      exists: false
    }
  }
}

function categorizeAspectRatio(width, height) {
  if (!width || !height) return { ratio: 0, bucket: 'unknown', orientation: 'unknown' }

  const ratio = width / height
  let bucket
  let orientation

  if (ratio < 0.8) {
    bucket = 'tall'
    orientation = 'portrait'
  } else if (ratio < 1.2) {
    bucket = 'square-ish'
    orientation = 'square'
  } else if (ratio < 1.5) {
    bucket = '4:3-ish'
    orientation = 'landscape'
  } else if (ratio < 2.0) {
    bucket = '16:9-ish'
    orientation = 'landscape'
  } else {
    bucket = 'wide'
    orientation = 'landscape'
  }

  return { ratio: Math.round(ratio * 100) / 100, bucket, orientation }
}

function getImageFlags(imageData, fileMeta) {
  const flags = []

  if (!fileMeta.exists) {
    flags.push('IMAGE_MISSING')
    return flags
  }

  const { width, height } = imageData
  const { fileSizeBytes } = fileMeta
  const { ratio } = categorizeAspectRatio(width, height)

  // Tiny image
  const minDim = Math.min(width || 0, height || 0)
  if (minDim > 0 && minDim < IMAGE_TINY_THRESHOLD) {
    flags.push('IMAGE_TINY')
  }

  // Extreme aspect ratio
  if (ratio > 0 && (ratio < IMAGE_EXTREME_ASPECT_MIN || ratio > IMAGE_EXTREME_ASPECT_MAX)) {
    flags.push('IMAGE_EXTREME_ASPECT')
  }

  // Large file
  if (fileSizeBytes > IMAGE_LARGE_FILE_THRESHOLD) {
    flags.push('IMAGE_LARGE_FILE')
  }

  return flags
}

async function uploadImage(client, imagePath, articleSlug) {
  const buffer = fs.readFileSync(imagePath)
  const filename = path.basename(imagePath)

  const asset = await client.assets.upload('image', buffer, {
    filename,
    source: {
      name: 'webflow-import',
      id: articleSlug
    }
  })

  return asset
}

// ============================================================================
// Portable Text Conversion
// ============================================================================

// Imported from ./lib/html-to-portable-text.js

// ============================================================================
// Editorial Flags
// ============================================================================

function computeEditorialFlags(article, dateInfo, imageFlags) {
  const flags = []

  // Date needs review if sentinel or derived
  if (dateInfo.derivation === 'SENTINEL_PLACEHOLDER' ||
      dateInfo.derivation.startsWith('DERIVED_FROM_')) {
    flags.push('DATE_NEEDS_REVIEW')
  }

  // Summary needs review if empty
  if (!article.summary || article.summary.trim() === '') {
    flags.push('SUMMARY_NEEDS_REVIEW')
  }

  // Image flags
  flags.push(...imageFlags)

  // Check for wrong alt text
  if (article.images?.[0]?.alt?.includes(WRONG_ALT_TEXT)) {
    flags.push('IMAGE_NEEDS_REVIEW')
  }

  return [...new Set(flags)] // dedupe
}

// ============================================================================
// Idempotency Check
// ============================================================================

async function articleExistsByUrl(client, externalUrl) {
  const existing = await client.fetch(
    `*[_type == "news" && externalUrl == $url][0]._id`,
    { url: externalUrl }
  )
  return existing
}

// ============================================================================
// Main Modes
// ============================================================================

async function runDryRun(articles) {
  console.log('\n=== DRY RUN MODE ===\n')

  const existingSlugs = new Set()
  const stats = {
    total: articles.length,
    dateExtracted: 0,
    dateSentinel: 0,
    imageMissing: 0,
    imageOk: 0,
    summaryMissing: 0,
    flagCounts: {},
    aspectBuckets: {},
    orientations: {},
    dimensions: [],
    fileSizes: []
  }

  for (const article of articles) {
    console.log(`\nArticle: "${article.title.slice(0, 60)}..."`)

    // Date extraction
    const dateInfo = extractDate(article)
    console.log(`  - Date: ${dateInfo.date} (${dateInfo.derivation})`)
    if (dateInfo.derivation === 'SENTINEL_PLACEHOLDER') {
      stats.dateSentinel++
    } else {
      stats.dateExtracted++
    }

    // Slug resolution
    const resolvedSlug = await resolveSlug(null, article.slug, existingSlugs, true)
    existingSlugs.add(resolvedSlug)
    console.log(`  - Slug: ${resolvedSlug} ${resolvedSlug !== article.slug ? '(modified)' : '(unique)'}`)

    // Image analysis
    if (article.images && article.images.length > 0) {
      const img = article.images[0]
      const imagePath = path.join(IMAGES_DIR, img.local)
      const fileMeta = getImageMetadata(imagePath)
      const aspect = categorizeAspectRatio(img.width, img.height)
      const imageFlags = getImageFlags(img, fileMeta)

      if (fileMeta.exists) {
        stats.imageOk++
        stats.dimensions.push({ w: img.width, h: img.height })
        stats.fileSizes.push(fileMeta.fileSizeBytes)
        stats.aspectBuckets[aspect.bucket] = (stats.aspectBuckets[aspect.bucket] || 0) + 1
        stats.orientations[aspect.orientation] = (stats.orientations[aspect.orientation] || 0) + 1
      } else {
        stats.imageMissing++
      }

      console.log(`  - Image: ${img.local}`)
      console.log(`    - Dimensions: ${img.width}x${img.height} (${aspect.bucket}, ${aspect.orientation})`)
      console.log(`    - File size: ${(fileMeta.fileSizeBytes / 1024).toFixed(1)} KB`)
      console.log(`    - Format: ${fileMeta.format}`)
      if (imageFlags.length > 0) {
        console.log(`    - Flags: ${imageFlags.join(', ')}`)
      }

      // Alt text check
      if (img.alt?.includes(WRONG_ALT_TEXT)) {
        console.log(`    - Alt text: WRONG (will use title instead)`)
      } else if (!img.alt) {
        console.log(`    - Alt text: EMPTY (will use title)`)
      }
    } else {
      stats.imageMissing++
      console.log(`  - Image: MISSING`)
    }

    // Portable Text conversion
    const portableText = htmlToPortableText(article.bodyHtml)
    if (portableText.error) {
      console.log(`  - Portable Text: FAILED - ${portableText.error}`)
    } else {
      console.log(`  - Portable Text: ${portableText.blocks.length} blocks valid`)
    }

    // Editorial flags
    const imageFlags = article.images?.[0] ?
      getImageFlags(article.images[0], getImageMetadata(path.join(IMAGES_DIR, article.images[0].local))) :
      ['IMAGE_MISSING']
    const editorialFlags = computeEditorialFlags(article, dateInfo, imageFlags)
    console.log(`  - Flags: ${editorialFlags.length > 0 ? editorialFlags.join(', ') : 'none'}`)

    // Track flag counts
    for (const flag of editorialFlags) {
      stats.flagCounts[flag] = (stats.flagCounts[flag] || 0) + 1
    }

    if (!article.summary) stats.summaryMissing++
  }

  // Roll-up summary
  console.log('\n' + '='.repeat(60))
  console.log('ROLL-UP SUMMARY')
  console.log('='.repeat(60))

  console.log(`\nArticles: ${stats.total}`)
  console.log(`  - Dates extracted: ${stats.dateExtracted}`)
  console.log(`  - Dates sentinel: ${stats.dateSentinel}`)
  console.log(`  - Summaries missing: ${stats.summaryMissing}`)

  console.log(`\nImages: ${stats.imageOk} OK, ${stats.imageMissing} missing`)

  if (stats.dimensions.length > 0) {
    const widths = stats.dimensions.map(d => d.w).sort((a, b) => a - b)
    const heights = stats.dimensions.map(d => d.h).sort((a, b) => a - b)
    console.log(`  - Width: min=${widths[0]}, median=${widths[Math.floor(widths.length/2)]}, max=${widths[widths.length-1]}`)
    console.log(`  - Height: min=${heights[0]}, median=${heights[Math.floor(heights.length/2)]}, max=${heights[heights.length-1]}`)
  }

  if (stats.fileSizes.length > 0) {
    const sizes = stats.fileSizes.sort((a, b) => a - b)
    console.log(`  - File size: min=${(sizes[0]/1024).toFixed(0)}KB, median=${(sizes[Math.floor(sizes.length/2)]/1024).toFixed(0)}KB, max=${(sizes[sizes.length-1]/1024).toFixed(0)}KB`)
  }

  console.log(`\nAspect buckets:`)
  for (const [bucket, count] of Object.entries(stats.aspectBuckets)) {
    console.log(`  - ${bucket}: ${count}`)
  }

  console.log(`\nOrientations:`)
  for (const [orient, count] of Object.entries(stats.orientations)) {
    console.log(`  - ${orient}: ${count}`)
  }

  console.log(`\nEditorial flags raised:`)
  for (const [flag, count] of Object.entries(stats.flagCounts)) {
    console.log(`  - ${flag}: ${count}`)
  }

  console.log('\n=== DRY RUN COMPLETE ===')
}

async function runImagesOnly(articles) {
  console.log('\n=== IMAGES ONLY MODE ===\n')

  const token = process.env.SANITY_API_TOKEN
  if (!token) {
    console.error('ERROR: SANITY_API_TOKEN environment variable required')
    process.exit(1)
  }

  const client = createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    token,
    useCdn: false
  })

  const imageRefs = {}
  const metadata = {}

  for (const article of articles) {
    if (!article.images || article.images.length === 0) {
      console.log(`Skipping ${article.slug}: no images`)
      continue
    }

    const img = article.images[0]
    const imagePath = path.join(IMAGES_DIR, img.local)

    if (!fs.existsSync(imagePath)) {
      console.log(`MISSING: ${img.local}`)
      metadata[img.local] = { error: 'FILE_NOT_FOUND' }
      continue
    }

    console.log(`Uploading: ${img.local}...`)

    try {
      const asset = await uploadImage(client, imagePath, article.slug)
      imageRefs[img.local] = asset._id

      const fileMeta = getImageMetadata(imagePath)
      const aspect = categorizeAspectRatio(img.width, img.height)

      metadata[img.local] = {
        assetId: asset._id,
        widthPx: img.width,
        heightPx: img.height,
        aspectRatio: aspect.ratio,
        aspectBucket: aspect.bucket,
        fileSizeBytes: fileMeta.fileSizeBytes,
        format: fileMeta.format,
        orientation: aspect.orientation,
        originalAlt: img.alt,
        flags: getImageFlags(img, fileMeta)
      }

      console.log(`  OK: ${asset._id}`)
    } catch (err) {
      console.log(`  FAILED: ${err.message}`)
      metadata[img.local] = { error: err.message }
    }
  }

  // Save refs and metadata
  const output = { refs: imageRefs, metadata }
  fs.writeFileSync(IMAGE_REFS_FILE, JSON.stringify(output, null, 2))
  console.log(`\nSaved to ${IMAGE_REFS_FILE}`)

  console.log('\n=== IMAGES UPLOAD COMPLETE ===')
}

async function runCreate(articles) {
  console.log('\n=== CREATE MODE ===\n')

  const token = process.env.SANITY_API_TOKEN
  if (!token) {
    console.error('ERROR: SANITY_API_TOKEN environment variable required')
    process.exit(1)
  }

  // Load image refs
  if (!fs.existsSync(IMAGE_REFS_FILE)) {
    console.error('ERROR: image-refs.json not found. Run --images-only first.')
    process.exit(1)
  }
  const imageData = JSON.parse(fs.readFileSync(IMAGE_REFS_FILE, 'utf-8'))
  const imageRefs = imageData.refs || {}
  const imageMeta = imageData.metadata || {}

  const client = createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    token,
    useCdn: false
  })

  const existingSlugs = new Set()
  const results = { created: 0, skipped: 0, failed: 0, orphanedAssets: [] }

  for (const article of articles) {
    console.log(`\nProcessing: "${article.title.slice(0, 50)}..."`)

    // Idempotency check by externalUrl
    const existingId = await articleExistsByUrl(client, article.sourceUrl)
    if (existingId) {
      console.log(`  SKIPPED: Already exists (${existingId})`)
      results.skipped++
      continue
    }

    // Date extraction
    const dateInfo = extractDate(article)

    // Slug resolution
    const resolvedSlug = await resolveSlug(client, article.slug, existingSlugs, false)
    existingSlugs.add(resolvedSlug)

    // Portable Text
    const portableText = htmlToPortableText(article.bodyHtml)
    if (portableText.error) {
      console.log(`  FAILED: Portable Text conversion - ${portableText.error}`)
      results.failed++
      continue
    }

    // Image reference
    let imageRef = null
    let imageAlt = article.title // fallback alt
    const imageFlags = []

    if (article.images?.[0]) {
      const img = article.images[0]
      const assetId = imageRefs[img.local]
      const meta = imageMeta[img.local]

      if (assetId) {
        imageRef = {
          _type: 'image',
          asset: { _type: 'reference', _ref: assetId }
        }

        // Use original alt only if it's not the wrong placeholder
        if (img.alt && !img.alt.includes(WRONG_ALT_TEXT)) {
          imageAlt = img.alt
        }

        if (meta?.flags) {
          imageFlags.push(...meta.flags)
        }
      } else {
        imageFlags.push('IMAGE_MISSING')
      }
    } else {
      imageFlags.push('IMAGE_MISSING')
    }

    // Summary (extract first paragraph if missing)
    let summary = article.summary
    if (!summary && portableText.blocks.length > 0) {
      const firstBlock = portableText.blocks.find(b => b._type === 'block' && b.children)
      if (firstBlock) {
        summary = firstBlock.children.map(c => c.text || '').join('').slice(0, 200)
      }
    }

    // Editorial flags
    const editorialFlags = computeEditorialFlags(article, dateInfo, imageFlags)

    // Build document
    const doc = {
      _type: 'news',
      title: article.title,
      slug: { _type: 'slug', current: resolvedSlug },
      date: dateInfo.date,
      summary: summary || undefined,
      body: portableText.blocks,
      source: 'external',
      externalUrl: article.sourceUrl,
      featured: false,
      editorialFlags: editorialFlags.length > 0 ? editorialFlags : undefined
    }

    // Add image if available
    if (imageRef) {
      doc.image = imageRef
      if (imageAlt) {
        doc.image.alt = imageAlt
      }
    }

    try {
      const created = await client.create(doc)
      console.log(`  CREATED: ${created._id}`)
      console.log(`    - Slug: ${resolvedSlug}`)
      console.log(`    - Date: ${dateInfo.date} (${dateInfo.derivation})`)
      console.log(`    - Flags: ${editorialFlags.join(', ') || 'none'}`)
      results.created++
    } catch (err) {
      console.log(`  FAILED: ${err.message}`)
      results.failed++

      // Track orphaned asset if we had one
      if (imageRef?.asset?._ref) {
        results.orphanedAssets.push({
          assetId: imageRef.asset._ref,
          articleSlug: article.slug,
          error: err.message
        })
      }
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('RESULTS')
  console.log('='.repeat(60))
  console.log(`Created: ${results.created}`)
  console.log(`Skipped: ${results.skipped}`)
  console.log(`Failed: ${results.failed}`)

  if (results.orphanedAssets.length > 0) {
    console.log(`\nOrphaned assets (cleanup needed):`)
    for (const orphan of results.orphanedAssets) {
      console.log(`  - ${orphan.assetId} (from ${orphan.articleSlug})`)
    }
  }

  console.log('\n=== CREATE COMPLETE ===')
}

// ============================================================================
// Entry Point
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const mode = args[0]

  if (!['--dry-run', '--images-only', '--create'].includes(mode)) {
    console.log('Usage: node import-news-to-sanity.js <mode>')
    console.log('  --dry-run      Validate without writing')
    console.log('  --images-only  Upload images only')
    console.log('  --create       Create documents')
    process.exit(1)
  }

  // Load articles
  if (!fs.existsSync(ARTICLES_FILE)) {
    console.error(`ERROR: ${ARTICLES_FILE} not found`)
    process.exit(1)
  }
  const articles = JSON.parse(fs.readFileSync(ARTICLES_FILE, 'utf-8'))
  console.log(`Loaded ${articles.length} articles from ${ARTICLES_FILE}`)

  if (mode === '--dry-run') {
    await runDryRun(articles)
  } else if (mode === '--images-only') {
    await runImagesOnly(articles)
  } else if (mode === '--create') {
    await runCreate(articles)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
