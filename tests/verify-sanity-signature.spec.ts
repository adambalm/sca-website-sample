/**
 * Unit tests for the inline Sanity webhook signature verifier.
 *
 * Runs under Playwright (already a devDep) but uses no browser. Tests
 * exercise the algorithm directly and, when @sanity/webhook is
 * available, cross-check that our verifier accepts payloads the
 * official library accepts. The cross-check test skips silently if
 * @sanity/webhook is not installed, so contributors can run unit tests
 * without adding a devDep.
 */
import { test, expect } from '@playwright/test'
import crypto from 'node:crypto'
import {
  parseSignatureHeader,
  verifySignature,
  MAX_SKEW_MS,
} from '../apps/web/src/lib/verify-sanity-signature'

const SECRET = 'unit-test-secret-not-real-do-not-use'
const PAYLOAD = JSON.stringify({
  _id: 'jobPosting-abc',
  _type: 'jobPosting',
  slug: { current: 'unit-test' },
})

function signPayload(body: string, ts: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(`${ts}.${body}`).digest('base64url')
}

function header(ts: string, sig: string): string {
  return `t=${ts},v1=${sig}`
}

test.describe('parseSignatureHeader', () => {
  test('parses a well-formed header', () => {
    const parsed = parseSignatureHeader('t=1700000000000,v1=abc')
    expect(parsed).toEqual({ ts: '1700000000000', sig: 'abc' })
  })

  test('returns null on missing parts', () => {
    expect(parseSignatureHeader('t=1700000000000')).toBeNull()
    expect(parseSignatureHeader('v1=abc')).toBeNull()
    expect(parseSignatureHeader('garbage')).toBeNull()
  })

  test('tolerates whitespace around the values', () => {
    const parsed = parseSignatureHeader('t = 1700000000000 , v1 = abc')
    expect(parsed).toEqual({ ts: '1700000000000', sig: 'abc' })
  })
})

test.describe('verifySignature', () => {
  test('accepts a fresh, validly-signed payload', () => {
    const ts = String(Date.now())
    const sig = signPayload(PAYLOAD, ts, SECRET)
    const result = verifySignature(PAYLOAD, header(ts, sig), SECRET)
    expect(result.valid).toBe(true)
    expect(Math.abs(result.ageMs)).toBeLessThan(1000)
  })

  test('rejects when signature header is missing', () => {
    const result = verifySignature(PAYLOAD, null, SECRET)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('missing-header')
  })

  test('rejects a malformed header', () => {
    const result = verifySignature(PAYLOAD, 'not-a-real-header', SECRET)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('malformed-header')
  })

  test('rejects a wrong secret', () => {
    const ts = String(Date.now())
    const sig = signPayload(PAYLOAD, ts, SECRET)
    const result = verifySignature(PAYLOAD, header(ts, sig), 'wrong-secret')
    expect(result.valid).toBe(false)
    // Could be length-mismatch or hmac-mismatch depending on digest length
    expect(['length-mismatch', 'hmac-mismatch']).toContain(result.reason)
  })

  test('rejects a tampered body', () => {
    const ts = String(Date.now())
    const sig = signPayload(PAYLOAD, ts, SECRET)
    const tampered = PAYLOAD.replace('jobPosting-abc', 'jobPosting-XYZ')
    const result = verifySignature(tampered, header(ts, sig), SECRET)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('hmac-mismatch')
  })

  test('rejects a stale signature (older than MAX_SKEW_MS)', () => {
    const staleTs = String(Date.now() - (MAX_SKEW_MS + 1000))
    const sig = signPayload(PAYLOAD, staleTs, SECRET)
    const result = verifySignature(PAYLOAD, header(staleTs, sig), SECRET)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('stale')
    expect(result.ageMs).toBeGreaterThan(MAX_SKEW_MS)
  })

  test('rejects a future-dated signature beyond MAX_SKEW_MS', () => {
    const futureTs = String(Date.now() + (MAX_SKEW_MS + 1000))
    const sig = signPayload(PAYLOAD, futureTs, SECRET)
    const result = verifySignature(PAYLOAD, header(futureTs, sig), SECRET)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('stale')
  })

  test('accepts a signature near the skew boundary', () => {
    // 4 minutes old — well under MAX_SKEW_MS (5 min) but old enough to
    // exercise the timestamp arithmetic.
    const ts = String(Date.now() - 4 * 60 * 1000)
    const sig = signPayload(PAYLOAD, ts, SECRET)
    const result = verifySignature(PAYLOAD, header(ts, sig), SECRET)
    expect(result.valid).toBe(true)
  })

  test('rejects a bad timestamp', () => {
    const sig = signPayload(PAYLOAD, 'not-a-number', SECRET)
    const result = verifySignature(PAYLOAD, header('not-a-number', sig), SECRET)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('bad-timestamp')
  })
})

test.describe('cross-check against @sanity/webhook', () => {
  test('our signature is accepted by the official Sanity verifier', async () => {
    // Dynamic import: if @sanity/webhook is not installed, skip cleanly.
    // Run `npm i -D @sanity/webhook` in the workspace root to enable.
    let isValidSignature: ((body: string, sig: string, secret: string) => Promise<boolean> | boolean) | null = null
    try {
      const mod = await import('@sanity/webhook')
      isValidSignature = mod.isValidSignature
    } catch {
      test.skip(true, '@sanity/webhook not installed — skipping cross-check')
      return
    }

    const ts = String(Date.now())
    const sig = signPayload(PAYLOAD, ts, SECRET)
    const sigHeader = header(ts, sig)

    // Both verifiers should accept the same payload.
    expect(verifySignature(PAYLOAD, sigHeader, SECRET).valid).toBe(true)
    expect(await isValidSignature!(PAYLOAD, sigHeader, SECRET)).toBe(true)
  })

  test('an invalid signature is rejected by both verifiers', async () => {
    let isValidSignature: ((body: string, sig: string, secret: string) => Promise<boolean> | boolean) | null = null
    try {
      const mod = await import('@sanity/webhook')
      isValidSignature = mod.isValidSignature
    } catch {
      test.skip(true, '@sanity/webhook not installed — skipping cross-check')
      return
    }

    const ts = String(Date.now())
    const sig = signPayload(PAYLOAD, ts, 'WRONG_SECRET')
    const sigHeader = header(ts, sig)

    expect(verifySignature(PAYLOAD, sigHeader, SECRET).valid).toBe(false)
    expect(await isValidSignature!(PAYLOAD, sigHeader, SECRET)).toBe(false)
  })
})
