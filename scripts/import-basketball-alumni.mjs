/**
 * Import basketball alumni into Sanity as alumniStory documents.
 *
 * This is a bootstrap/staging import. After the initial run, Sanity Studio
 * becomes the source of truth. Do not routinely re-run after manual edits.
 *
 * Usage:
 *   SANITY_TOKEN=... node scripts/import-basketball-alumni.mjs --dry-run
 *   SANITY_TOKEN=... node scripts/import-basketball-alumni.mjs --create
 *
 * Data source: data/basketball-alumni.json
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const PROJECT_ID = 'wesg5rw8'
const DATASET = 'production'
const TOKEN = process.env.SANITY_TOKEN

const mode = process.argv[2]

if (!['--dry-run', '--create'].includes(mode)) {
  console.error('Usage: node scripts/import-basketball-alumni.mjs [--dry-run | --create]')
  process.exit(1)
}

if (mode === '--create' && !TOKEN) {
  console.error('Missing SANITY_TOKEN env var.')
  process.exit(1)
}

// Load data
const dataPath = resolve(__dirname, '..', 'data', 'basketball-alumni.json')
const alumni = JSON.parse(readFileSync(dataPath, 'utf-8'))

console.log(`Loaded ${alumni.length} entries from data/basketball-alumni.json\n`)

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 96)
}

// Build documents and check for slug collisions
const slugMap = new Map()
const docs = []

for (const entry of alumni) {
  const slug = slugify(entry.name)
  const _id = `alumni-bball-${slug}`

  if (slugMap.has(slug)) {
    console.error(`\n❌ SLUG COLLISION: "${entry.name}" and "${slugMap.get(slug)}" both slugify to "${slug}"`)
    console.error('Fix the data file to disambiguate names before importing.')
    process.exit(1)
  }
  slugMap.set(slug, entry.name)

  const COACH_IDS = {
    bergeron: '158feefb-f787-47c9-8573-65ae991f2088',
  }

  const doc = {
    _id,
    _type: 'alumniStory',
    name: entry.name,
    slug: { _type: 'slug', current: slug },
    graduationYear: entry.graduationYear,
    university: entry.university,
    sport: 'basketball',
    featured: false,
    needsCoachReview: entry.needsCoachReview || false,
  }

  if (entry.externalUrl) doc.externalUrl = entry.externalUrl
  if (entry.coachNote) doc.coachNote = entry.coachNote
  if (entry.achievement) doc.achievement = entry.achievement
  if (entry.coachRef && COACH_IDS[entry.coachRef]) {
    doc.coach = { _type: 'reference', _ref: COACH_IDS[entry.coachRef] }
  }

  docs.push(doc)
}

console.log(`${docs.length} documents prepared, 0 slug collisions.\n`)

// Dry-run: print summary table
if (mode === '--dry-run') {
  console.log('DRY RUN — no mutations will be sent.\n')
  console.log('Name'.padEnd(30) + 'Year'.padEnd(6) + 'University'.padEnd(35) + 'Review?'.padEnd(9) + 'ID')
  console.log('-'.repeat(110))
  for (const doc of docs) {
    console.log(
      doc.name.padEnd(30) +
      String(doc.graduationYear || '').padEnd(6) +
      (doc.university || '').padEnd(35) +
      String(doc.needsCoachReview).padEnd(9) +
      doc._id
    )
  }
  console.log(`\nTotal: ${docs.length} entries (${docs.filter(d => d.needsCoachReview).length} flagged for coach review)`)
  process.exit(0)
}

// Create mode
console.log('⚠️  WARNING: This uses createOrReplace. If you have manually edited')
console.log('   documents in Studio since the last import, those changes will be')
console.log('   overwritten. Only run this for the initial staging import.\n')

const mutations = docs.map(doc => ({ createOrReplace: doc }))

async function run() {
  console.log(`Importing ${mutations.length} alumni into Sanity (${PROJECT_ID}/${DATASET})...\n`)

  const response = await fetch(
    `https://${PROJECT_ID}.api.sanity.io/v2024-01-01/data/mutate/${DATASET}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ mutations }),
    }
  )

  const result = await response.json()

  if (!response.ok) {
    console.error('Import failed:', JSON.stringify(result, null, 2))
    process.exit(1)
  }

  console.log(`✅ Successfully imported ${result.results.length} alumni\n`)

  for (let i = 0; i < docs.length; i++) {
    const status = result.results[i]
    const doc = docs[i]
    console.log(`  ${status.operation.padEnd(15)} ${doc.name} (${doc.graduationYear})`)
    if (doc.needsCoachReview) console.log(`${''.padEnd(17)}⚠ flagged for coach review`)
  }

  const reviewCount = docs.filter(d => d.needsCoachReview).length
  console.log(`\nDone. ${reviewCount} entries flagged for coach review.`)
}

run()
