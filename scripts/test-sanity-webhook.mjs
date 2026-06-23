#!/usr/bin/env node
/**
 * Manually exercise /api/sanity-webhook with a signed payload.
 *
 * Reads SANITY_WEBHOOK_SECRET from scripts/.env (the canonical local
 * source for write tokens). Signs a synthetic payload and POSTs it to
 * the target URL, then prints the response.
 *
 * Usage:
 *   node scripts/test-sanity-webhook.mjs                          # defaults
 *   node scripts/test-sanity-webhook.mjs --url=http://localhost:4321
 *   node scripts/test-sanity-webhook.mjs --type=news --slug=hello
 *   node scripts/test-sanity-webhook.mjs --type=siteSettings      # global
 *   node scripts/test-sanity-webhook.mjs --bad-secret              # negative test
 *
 * Returns exit code 0 on 200, non-zero otherwise.
 */
import crypto from 'node:crypto'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? true]
  })
)

const url = args.url || 'https://www.springfieldcommonwealthacademy.org/api/sanity-webhook'
const type = args.type || 'jobPosting'
const slug = args.slug || 'director-of-college-counseling-and-international-programs'
const useBadSecret = !!args['bad-secret']

const secret = useBadSecret
  ? 'this-is-not-the-real-secret'
  : process.env.SANITY_WEBHOOK_SECRET

if (!secret) {
  console.error('FAIL: SANITY_WEBHOOK_SECRET not set in scripts/.env')
  console.error('      add it locally, OR pass --bad-secret to exercise the negative path')
  process.exit(1)
}

const docId = `${type}-test-${Date.now()}`
const payload = JSON.stringify({
  _id: docId,
  _type: type,
  slug: { current: slug },
})

const timestamp = Date.now().toString()
const signature = crypto
  .createHmac('sha256', secret)
  .update(`${timestamp}.${payload}`)
  .digest('base64url')

const sigHeader = `t=${timestamp},v1=${signature}`

console.log(`POST ${url}`)
console.log(`  body: ${payload}`)
console.log(`  sanity-webhook-signature: ${sigHeader}`)
console.log(`  using ${useBadSecret ? 'BAD secret (expect 401)' : 'real secret'}`)

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'sanity-webhook-signature': sigHeader,
    'idempotency-key': `test-${Date.now()}`,
    'sanity-operation': 'update',
    'sanity-document-id': docId,
  },
  body: payload,
})

const text = await res.text()
console.log(`\nHTTP ${res.status}`)
console.log(text)

process.exit(res.ok ? 0 : 1)
