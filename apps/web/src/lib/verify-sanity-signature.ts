import crypto from 'node:crypto'

/**
 * Inline Sanity GROQ webhook signature verification.
 *
 * Format (from Sanity's webhook-toolkit source, modeled on Stripe):
 *   header `sanity-webhook-signature` -> `t=<unix-ms>,v1=<base64url-sig>`
 *   sig = base64url( HMAC-SHA256( `${timestamp}.${rawBody}`, secret ) )
 *   base64url padding `=` is stripped both when signing and comparing.
 *
 * Replay protection: timestamps older than MAX_SKEW_MS are rejected
 * even if the HMAC is otherwise valid. Sanity does not currently enforce
 * a window in @sanity/webhook itself; we add it here.
 *
 * The verification is structurally equivalent to @sanity/webhook's
 * `isValidSignature`. Tests/verify-sanity-signature.spec.ts cross-checks
 * the two against the same payload to catch drift.
 */

export const SIGNATURE_HEADER = 'sanity-webhook-signature'

// Reject signatures older than this many ms. Generous enough to allow
// Sanity's retry window (default: 2 retries at 30s each = ~90s) plus
// clock skew between Sanity and Vercel.
export const MAX_SKEW_MS = 5 * 60 * 1000

export interface VerifyResult {
  valid: boolean
  ageMs: number // signed delta from now; negative if timestamp is in the future
  reason?: 'missing-header' | 'malformed-header' | 'bad-timestamp' | 'stale' | 'length-mismatch' | 'hmac-mismatch'
}

interface ParsedHeader {
  ts: string
  sig: string
}

export function parseSignatureHeader(header: string): ParsedHeader | null {
  const parts = header.split(',')
  let ts: string | undefined
  let sig: string | undefined
  for (const part of parts) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    const k = part.slice(0, eq).trim()
    const v = part.slice(eq + 1).trim()
    if (k === 't') ts = v
    else if (k === 'v1') sig = v
  }
  if (!ts || !sig) return null
  return { ts, sig }
}

export function verifySignature(
  rawBody: string,
  header: string | null,
  secret: string,
  now: number = Date.now()
): VerifyResult {
  if (!header) return { valid: false, ageMs: 0, reason: 'missing-header' }

  const parsed = parseSignatureHeader(header)
  if (!parsed) return { valid: false, ageMs: 0, reason: 'malformed-header' }

  const tsNum = Number.parseInt(parsed.ts, 10)
  if (!Number.isFinite(tsNum) || tsNum <= 0) {
    return { valid: false, ageMs: 0, reason: 'bad-timestamp' }
  }
  const ageMs = now - tsNum
  if (Math.abs(ageMs) > MAX_SKEW_MS) {
    return { valid: false, ageMs, reason: 'stale' }
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${parsed.ts}.${rawBody}`)
    .digest('base64url')

  const a = Buffer.from(parsed.sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length) {
    return { valid: false, ageMs, reason: 'length-mismatch' }
  }
  try {
    const valid = crypto.timingSafeEqual(a, b)
    return valid ? { valid: true, ageMs } : { valid: false, ageMs, reason: 'hmac-mismatch' }
  } catch {
    return { valid: false, ageMs, reason: 'length-mismatch' }
  }
}
