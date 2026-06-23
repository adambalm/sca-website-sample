#!/usr/bin/env node
/**
 * PDF asset upload smoke test.
 *
 * Uploads a PDF to Sanity as a file asset, fetches the CDN URL, verifies
 * the served Content-Type, and deletes the asset to leave no residue.
 *
 * Usage:
 *   node scripts/smoke-pdf-upload.mjs <pdf-path>
 *   node scripts/smoke-pdf-upload.mjs   # uses default path
 *
 * Requires SANITY_API_TOKEN in scripts/.env (must have write permission).
 */

import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const PDF_PATH = process.argv[2] || 'C:/Users/Guest1/Downloads/Director-of-College-Counseling.pdf'

const token =
  process.env.SANITY_API_TOKEN ||
  process.env.SANITY_API_WRITE_TOKEN ||
  process.env.SANITY_TOKEN
if (!token) {
  console.error('FAIL: no Sanity write token in scripts/.env')
  console.error('      expected one of: SANITY_API_TOKEN, SANITY_API_WRITE_TOKEN, SANITY_TOKEN')
  process.exit(1)
}

if (!fs.existsSync(PDF_PATH)) {
  console.error(`FAIL: PDF not found at ${PDF_PATH}`)
  process.exit(1)
}

const client = createClient({
  projectId: 'wesg5rw8',
  dataset: 'production',
  token,
  apiVersion: '2024-01-01',
  useCdn: false,
})

console.log(`[1/5] Reading PDF from ${PDF_PATH}`)
const buffer = fs.readFileSync(PDF_PATH)
console.log(`      Size on disk: ${buffer.length} bytes`)

console.log('[2/5] Uploading as file asset (contentType: application/pdf)...')
const asset = await client.assets.upload('file', buffer, {
  filename: 'smoke-test-pdf.pdf',
  contentType: 'application/pdf',
})
console.log(`      Asset _id: ${asset._id}`)
console.log(`      Asset url: ${asset.url}`)
console.log(`      Asset mimeType: ${asset.mimeType}`)
console.log(`      Asset size: ${asset.size}`)
console.log(`      Asset extension: ${asset.extension}`)

console.log('[3/5] HEAD request to verify Content-Type...')
const res = await fetch(asset.url, { method: 'HEAD' })
const ct = res.headers.get('content-type') || ''
const cl = res.headers.get('content-length') || ''
console.log(`      HTTP ${res.status}`)
console.log(`      Content-Type: ${ct}`)
console.log(`      Content-Length: ${cl}`)

const pass200 = res.status === 200
const passCT = ct.includes('pdf')
const passSize = cl === String(buffer.length)

console.log('[4/5] Results:')
console.log(`      200 OK:                ${pass200 ? 'PASS' : 'FAIL'}`)
console.log(`      Content-Type is PDF:   ${passCT ? 'PASS' : 'FAIL'}`)
console.log(`      Size matches on-disk:  ${passSize ? 'PASS' : 'FAIL'}`)

console.log(`[5/5] Cleaning up asset ${asset._id}...`)
try {
  await client.delete(asset._id)
  console.log('      Deleted.')
} catch (e) {
  console.warn(`      Delete failed (you may need to remove manually in Studio): ${e.message}`)
}

const allPass = pass200 && passCT && passSize
console.log(allPass ? '\nSMOKE TEST PASSED' : '\nSMOKE TEST FAILED')
process.exit(allPass ? 0 : 1)
