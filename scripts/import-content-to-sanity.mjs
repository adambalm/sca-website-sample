#!/usr/bin/env node
/**
 * Content Import Script: Webflow Extract → Sanity
 *
 * Imports info pages and programs from data/webflow-extract/ into Sanity.
 * Data is already in Sanity-native Portable Text format from extraction.
 * Images are uploaded from local files to Sanity's CDN.
 *
 * Modes:
 *   --dry-run   Validate and summarize what would be created (default)
 *   --create    Upload images and create documents in Sanity
 *
 * Requires SANITY_API_TOKEN environment variable for --create mode.
 */

import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load scripts/.env
dotenv.config({ path: path.join(__dirname, '.env') })

// ============================================================================
// Configuration
// ============================================================================

const SANITY_PROJECT_ID = 'wesg5rw8'
const SANITY_DATASET = 'production'
const SANITY_API_VERSION = '2024-01-01'

const DATA_DIR = path.join(__dirname, '..', 'data', 'webflow-extract')
const PAGES_FILE = path.join(DATA_DIR, 'info-pages.json')
const PROGRAMS_FILE = path.join(DATA_DIR, 'programs.json')
const IMAGES_DIR = path.join(DATA_DIR, 'images')

// Slug cleanup: remove Webflow collision suffixes
// Also map parent-reference slugs to their cleaned versions
const SLUG_OVERRIDES = {
  'about-us-2': 'about',
  'about-us': 'about',      // children reference this as parent
  'academics-2': 'academics',
  'athletics-3': 'athletics',
  'student-life-3': 'student-life',
}

// ============================================================================
// Sanity Client
// ============================================================================

function getClient(requireToken = false) {
  const token = process.env.SANITY_TOKEN
  if (requireToken && !token) {
    console.error('ERROR: SANITY_TOKEN not found. Check scripts/.env')
    process.exit(1)
  }

  return createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    token: token || undefined,
    useCdn: false,
  })
}

// ============================================================================
// Idempotency
// ============================================================================

async function documentExists(client, type, slug) {
  const existing = await client.fetch(
    `*[_type == $type && slug.current == $slug][0]._id`,
    { type, slug }
  )
  return existing || null
}

// ============================================================================
// Image Handling
// ============================================================================

function findPageImages(pageSlug) {
  // Images are named: page-{slug}-{webflowId}-{filename}.{ext}
  // or: program-{slug}-{webflowId}-{filename}.{ext}
  if (!fs.existsSync(IMAGES_DIR)) return []

  const files = fs.readdirSync(IMAGES_DIR)
  const prefix = `page-${pageSlug}-`
  return files.filter(f => f.startsWith(prefix)).map(f => path.join(IMAGES_DIR, f))
}

function findProgramImages(programSlug) {
  if (!fs.existsSync(IMAGES_DIR)) return []

  const files = fs.readdirSync(IMAGES_DIR)
  const prefix = `program-${programSlug}-`
  return files.filter(f => f.startsWith(prefix)).map(f => path.join(IMAGES_DIR, f))
}

async function uploadImage(client, imagePath, sourceId) {
  const buffer = fs.readFileSync(imagePath)
  const filename = path.basename(imagePath)

  const asset = await client.assets.upload('image', buffer, {
    filename,
    source: {
      name: 'webflow-import',
      id: sourceId,
    },
  })

  return asset
}

function pickFeaturedImage(imagePaths) {
  // Prefer the first non-SVG, non-tiny image
  const validExts = ['.jpg', '.jpeg', '.png', '.webp']
  const candidates = imagePaths.filter(p => {
    const ext = path.extname(p).toLowerCase()
    if (!validExts.includes(ext)) return false
    try {
      const stats = fs.statSync(p)
      return stats.size > 5000 // skip tiny icons
    } catch { return false }
  })

  return candidates[0] || imagePaths[0] || null
}

// ============================================================================
// Slug Resolution
// ============================================================================

function resolveSlug(originalSlug) {
  return SLUG_OVERRIDES[originalSlug] || originalSlug
}

// ============================================================================
// Page Import
// ============================================================================

async function importPages(client, pages, dryRun) {
  console.log('\n📄 IMPORTING PAGES\n')

  // Sort: parents first (no suggestedParent), then children
  const sorted = [...pages].sort((a, b) => {
    const aHasParent = a._extraction?.suggestedParent ? 1 : 0
    const bHasParent = b._extraction?.suggestedParent ? 1 : 0
    return aHasParent - bHasParent
  })

  // Track created page IDs for parent linking
  const pageIdsBySlug = {}
  const results = { created: 0, skipped: 0, failed: 0 }

  for (const page of sorted) {
    const slug = resolveSlug(page.slug.current)
    const title = page.title

    console.log(`  "${title}" → /${slug}`)

    // Idempotency check
    const existingId = await documentExists(client, 'page', slug)
    if (existingId) {
      console.log(`    ⏭  SKIPPED (exists: ${existingId})`)
      pageIdsBySlug[slug] = existingId
      results.skipped++
      continue
    }

    if (dryRun) {
      // Find images
      const images = findPageImages(page.slug.current)
      const featured = pickFeaturedImage(images)

      console.log(`    📝 WOULD CREATE`)
      console.log(`    - Body: ${page.body?.length || 0} blocks`)
      console.log(`    - SEO: ${page.seo ? 'yes' : 'no'}`)
      console.log(`    - Images found: ${images.length}${featured ? ` (featured: ${path.basename(featured)})` : ''}`)

      if (page._extraction?.suggestedParent) {
        const parentSlug = resolveSlug(page._extraction.suggestedParent)
        console.log(`    - Parent: ${parentSlug}`)
      }

      results.created++
      continue
    }

    // --- CREATE MODE ---
    try {
      // Upload featured image
      let imageRef = null
      const images = findPageImages(page.slug.current)
      const featuredPath = pickFeaturedImage(images)

      if (featuredPath) {
        console.log(`    📷 Uploading ${path.basename(featuredPath)}...`)
        const asset = await uploadImage(client, featuredPath, slug)
        imageRef = {
          _type: 'image',
          asset: { _type: 'reference', _ref: asset._id },
        }
        console.log(`    ✅ Uploaded: ${asset._id}`)
      }

      // Build document
      const doc = {
        _type: 'page',
        title,
        slug: { _type: 'slug', current: slug },
        body: page.body || [],
        seo: page.seo || undefined,
      }

      // Parent linking
      if (page._extraction?.suggestedParent) {
        const parentSlug = resolveSlug(page._extraction.suggestedParent)
        const parentId = pageIdsBySlug[parentSlug]
        if (parentId) {
          doc.parent = { _type: 'reference', _ref: parentId }
          console.log(`    🔗 Linked to parent: ${parentSlug}`)
        } else {
          console.log(`    ⚠️  Parent "${parentSlug}" not found`)
        }
      }

      const created = await client.create(doc)
      pageIdsBySlug[slug] = created._id
      console.log(`    ✅ CREATED: ${created._id}`)
      results.created++
    } catch (err) {
      console.log(`    ❌ FAILED: ${err.message}`)
      results.failed++
    }
  }

  return results
}

// ============================================================================
// Program Import
// ============================================================================

async function importPrograms(client, programs, dryRun) {
  console.log('\n🎓 IMPORTING PROGRAMS\n')

  const results = { created: 0, skipped: 0, failed: 0 }

  for (const program of programs) {
    const slug = resolveSlug(program.slug.current)
    const name = program.name

    console.log(`  "${name}" → /${slug} [${program.category}]`)

    // Idempotency check
    const existingId = await documentExists(client, 'program', slug)
    if (existingId) {
      console.log(`    ⏭  SKIPPED (exists: ${existingId})`)
      results.skipped++
      continue
    }

    if (dryRun) {
      const images = findProgramImages(program.slug.current)
      const featured = pickFeaturedImage(images)
      const cdnImage = program._extraction?.featuredImage

      console.log(`    📝 WOULD CREATE`)
      console.log(`    - Description: ${program.description?.length || 0} blocks`)
      console.log(`    - Category: ${program.category || 'none'}`)
      console.log(`    - Local images: ${images.length}${featured ? ` (featured: ${path.basename(featured)})` : ''}`)
      if (cdnImage && images.length === 0) {
        console.log(`    - CDN image available: ${cdnImage.src.substring(0, 60)}...`)
      }

      results.created++
      continue
    }

    // --- CREATE MODE ---
    try {
      // Upload featured image
      let imageRef = null

      // Try local image first
      const images = findProgramImages(program.slug.current)
      let featuredPath = pickFeaturedImage(images)

      // If extraction has a local reference, use that
      if (!featuredPath && program._extraction?.featuredImage?.local) {
        const localPath = path.join(IMAGES_DIR, program._extraction.featuredImage.local)
        if (fs.existsSync(localPath)) {
          featuredPath = localPath
        }
      }

      if (featuredPath) {
        console.log(`    📷 Uploading ${path.basename(featuredPath)}...`)
        const asset = await uploadImage(client, featuredPath, slug)
        imageRef = {
          _type: 'image',
          asset: { _type: 'reference', _ref: asset._id },
        }
        console.log(`    ✅ Uploaded: ${asset._id}`)
      }

      // Build document
      const doc = {
        _type: 'program',
        name,
        slug: { _type: 'slug', current: slug },
        category: program.category || undefined,
        description: program.description || [],
      }

      if (imageRef) {
        doc.image = imageRef
      }

      const created = await client.create(doc)
      console.log(`    ✅ CREATED: ${created._id}`)
      results.created++
    } catch (err) {
      console.log(`    ❌ FAILED: ${err.message}`)
      results.failed++
    }
  }

  return results
}

// ============================================================================
// Entry Point
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const mode = args[0]

  if (!['--dry-run', '--create'].includes(mode)) {
    console.log('Usage: node import-content-to-sanity.mjs <mode>')
    console.log('  --dry-run   Validate and summarize (no writes)')
    console.log('  --create    Upload images and create documents')
    process.exit(1)
  }

  const dryRun = mode === '--dry-run'

  // Load data
  const pages = JSON.parse(fs.readFileSync(PAGES_FILE, 'utf-8'))
  const programs = JSON.parse(fs.readFileSync(PROGRAMS_FILE, 'utf-8'))
  console.log(`Loaded ${pages.length} pages and ${programs.length} programs`)

  if (dryRun) {
    console.log('\n=== DRY RUN MODE ===')
  } else {
    console.log('\n=== CREATE MODE ===')
  }

  const client = getClient(!dryRun)

  // Import pages first (so parent references exist for children)
  const pageResults = await importPages(client, pages, dryRun)

  // Then programs
  const programResults = await importPrograms(client, programs, dryRun)

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('RESULTS')
  console.log('='.repeat(60))
  console.log(`Pages:    ${pageResults.created} created, ${pageResults.skipped} skipped, ${pageResults.failed} failed`)
  console.log(`Programs: ${programResults.created} created, ${programResults.skipped} skipped, ${programResults.failed} failed`)
  console.log(`Total:    ${pageResults.created + programResults.created} created`)
  console.log('\n=== COMPLETE ===')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
