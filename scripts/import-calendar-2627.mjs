/**
 * Import 2026-2027 calendar events from the SCA spreadsheet into Sanity.
 * 
 * Source: Column AA ("Notes") of the "26-27Student" tab
 * Data was verified by CSV export + browser inspection on 2026-03-23.
 * 
 * Usage: node scripts/import-calendar-2627.mjs
 */

const PROJECT_ID = 'wesg5rw8'
const DATASET = 'production'
const TOKEN = process.env.SANITY_TOKEN

if (!TOKEN) {
  console.error('Missing SANITY_TOKEN env var. Run with: SANITY_TOKEN=... node scripts/import-calendar-2627.mjs')
  process.exit(1)
}

// Events parsed from the 26-27Student spreadsheet Notes column
// Year inference: Jul-Dec = 2026, Jan-Jun = 2027
const events = [
  {
    title: 'SCA Summer School',
    startDate: '2026-06-28T00:00:00-04:00',
    endDate: '2026-08-07T00:00:00-04:00',
    allDay: true,
    category: 'academic',
  },
  {
    title: 'Students Arrival',
    startDate: '2026-09-05T00:00:00-04:00',
    endDate: '2026-09-06T00:00:00-04:00',
    allDay: true,
    category: 'community',
  },
  {
    title: 'Labor Day — No Class',
    startDate: '2026-09-07T00:00:00-04:00',
    endDate: null,
    allDay: true,
    category: 'holiday',
  },
  {
    title: 'Student Orientation',
    startDate: '2026-09-08T00:00:00-04:00',
    endDate: null,
    allDay: true,
    category: 'academic',
  },
  {
    title: 'Classes Begin',
    startDate: '2026-09-09T00:00:00-04:00',
    endDate: null,
    allDay: true,
    category: 'academic',
  },
  {
    title: 'Columbus Day — No Class',
    startDate: '2026-10-12T00:00:00-04:00',
    endDate: null,
    allDay: true,
    category: 'holiday',
  },
  {
    title: 'Veterans Day — No Class',
    startDate: '2026-11-11T00:00:00-05:00',
    endDate: null,
    allDay: true,
    category: 'holiday',
  },
  {
    title: 'Thanksgiving Break — No Class',
    startDate: '2026-11-25T00:00:00-05:00',
    endDate: '2026-11-27T00:00:00-05:00',
    allDay: true,
    category: 'holiday',
  },
  {
    title: 'Winter Break Begins',
    startDate: '2026-12-19T00:00:00-05:00',
    endDate: null,
    allDay: true,
    category: 'holiday',
  },
  {
    title: 'MLK Day — No Class',
    startDate: '2027-01-18T00:00:00-05:00',
    endDate: null,
    allDay: true,
    category: 'holiday',
  },
  {
    title: 'Classes Begin (Spring Semester)',
    startDate: '2027-01-19T00:00:00-05:00',
    endDate: null,
    allDay: true,
    category: 'academic',
  },
  {
    title: 'Presidents Day — No Class',
    startDate: '2027-02-15T00:00:00-05:00',
    endDate: null,
    allDay: true,
    category: 'holiday',
  },
  {
    title: "Patriots' Day — No Class",
    startDate: '2027-04-19T00:00:00-04:00',
    endDate: null,
    allDay: true,
    category: 'holiday',
  },
  {
    title: 'Classes End',
    startDate: '2027-05-14T00:00:00-04:00',
    endDate: null,
    allDay: true,
    category: 'academic',
  },
  {
    title: 'Graduation',
    startDate: '2027-05-15T00:00:00-04:00',
    endDate: null,
    allDay: true,
    category: 'academic',
  },
  {
    title: 'AP Test Week',
    startDate: '2027-05-16T00:00:00-04:00',
    endDate: '2027-05-29T00:00:00-04:00',
    allDay: true,
    category: 'academic',
  },
]

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 96)
}

// Build Sanity mutations
const mutations = events.map(evt => {
  const slug = slugify(evt.title)
  const _id = `event-cal-2627-${slug}`
  
  const doc = {
    _id,
    _type: 'event',
    title: evt.title,
    slug: { _type: 'slug', current: slug },
    startDate: evt.startDate,
    allDay: evt.allDay,
    category: evt.category,
    source: 'manual',
  }
  
  if (evt.endDate) doc.endDate = evt.endDate
  
  return { createOrReplace: doc }
})

async function run() {
  console.log(`Importing ${mutations.length} events into Sanity (${PROJECT_ID}/${DATASET})...\n`)
  
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
  
  console.log(`✅ Successfully imported ${result.results.length} events\n`)
  
  // Print summary
  events.forEach((evt, i) => {
    const status = result.results[i]
    console.log(`  ${status.operation.padEnd(15)} ${evt.title}`)
    console.log(`                 ${evt.startDate}${evt.endDate ? ' → ' + evt.endDate : ''}`)
    console.log(`                 ${evt.category} | allDay: ${evt.allDay}\n`)
  })
}

run()
