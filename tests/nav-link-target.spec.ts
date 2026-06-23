/**
 * Unit tests for the navigation link target/rel helper.
 *
 * Runs under Playwright (already a devDep) but uses no browser. Pure
 * logic tests for href → {target, rel} mapping used by BaseLayout's
 * five nav render sites.
 */
import { test, expect } from '@playwright/test'
import {
  isExternalHref,
  isDocumentHref,
  getNavLinkTargetAttrs,
} from '../apps/web/src/lib/nav-link-target'

test.describe('isExternalHref', () => {
  test('returns false for null/undefined/empty', () => {
    expect(isExternalHref(null)).toBe(false)
    expect(isExternalHref(undefined)).toBe(false)
    expect(isExternalHref('')).toBe(false)
  })

  test('returns false for relative paths', () => {
    expect(isExternalHref('/about')).toBe(false)
    expect(isExternalHref('/about/#section')).toBe(false)
    expect(isExternalHref('#anchor')).toBe(false)
  })

  test('returns false for mailto: and tel:', () => {
    expect(isExternalHref('mailto:foo@bar.com')).toBe(false)
    expect(isExternalHref('tel:+15551234')).toBe(false)
  })

  test('returns false for same-site absolute URLs', () => {
    expect(isExternalHref('https://www.springfieldcommonwealthacademy.org/about')).toBe(false)
    expect(isExternalHref('https://springfieldcommonwealthacademy.org/')).toBe(false)
    expect(isExternalHref('https://www.scacademy.ai/programs')).toBe(false)
    expect(isExternalHref('https://scacademy.ai')).toBe(false)
  })

  test('returns false for same-site URLs regardless of case', () => {
    expect(isExternalHref('HTTPS://WWW.SPRINGFIELDCOMMONWEALTHACADEMY.ORG/about')).toBe(false)
  })

  test('returns true for external http and https URLs', () => {
    expect(isExternalHref('https://example.com')).toBe(true)
    expect(isExternalHref('http://example.com/path')).toBe(true)
    expect(isExternalHref('https://cdn.sanity.io/files/wesg5rw8/production/abc.pdf')).toBe(true)
  })

  test('returns false for malformed URLs that pass the protocol check', () => {
    expect(isExternalHref('https://')).toBe(false)
  })
})

test.describe('isDocumentHref', () => {
  test('returns false for null/undefined/empty', () => {
    expect(isDocumentHref(null)).toBe(false)
    expect(isDocumentHref(undefined)).toBe(false)
    expect(isDocumentHref('')).toBe(false)
  })

  test('returns true for .pdf links (case-insensitive)', () => {
    expect(isDocumentHref('/files/handbook.pdf')).toBe(true)
    expect(isDocumentHref('https://example.com/file.PDF')).toBe(true)
    expect(isDocumentHref('https://www.springfieldcommonwealthacademy.org/files/posting.pdf')).toBe(true)
  })

  test('returns true for .pdf with query string or fragment', () => {
    expect(isDocumentHref('/files/handbook.pdf?v=2')).toBe(true)
    expect(isDocumentHref('/files/handbook.pdf#page=3')).toBe(true)
  })

  test('returns true for Sanity CDN file URLs', () => {
    expect(isDocumentHref('https://cdn.sanity.io/files/wesg5rw8/production/abc.pdf')).toBe(true)
    expect(isDocumentHref('https://cdn.sanity.io/files/wesg5rw8/production/abc.docx')).toBe(true)
  })

  test('returns false for non-document URLs', () => {
    expect(isDocumentHref('/about')).toBe(false)
    expect(isDocumentHref('https://example.com')).toBe(false)
    expect(isDocumentHref('https://cdn.sanity.io/images/wesg5rw8/production/photo.jpg')).toBe(false)
  })

  test('does not match .pdf as substring of other paths', () => {
    expect(isDocumentHref('/files/handbook.pdf.html')).toBe(false)
    expect(isDocumentHref('/notpdf')).toBe(false)
  })
})

test.describe('getNavLinkTargetAttrs', () => {
  test('returns {} for null/undefined/empty', () => {
    expect(getNavLinkTargetAttrs(null)).toEqual({})
    expect(getNavLinkTargetAttrs(undefined)).toEqual({})
    expect(getNavLinkTargetAttrs('')).toEqual({})
  })

  test('returns {} for relative internal links', () => {
    expect(getNavLinkTargetAttrs('/about')).toEqual({})
    expect(getNavLinkTargetAttrs('/news/some-article')).toEqual({})
  })

  test('returns {} for same-site absolute URLs', () => {
    expect(getNavLinkTargetAttrs('https://www.springfieldcommonwealthacademy.org/about')).toEqual({})
    expect(getNavLinkTargetAttrs('https://springfieldcommonwealthacademy.org/news')).toEqual({})
    expect(getNavLinkTargetAttrs('https://scacademy.ai/programs')).toEqual({})
  })

  test('returns {} for mailto: and tel:', () => {
    expect(getNavLinkTargetAttrs('mailto:foo@bar.com')).toEqual({})
    expect(getNavLinkTargetAttrs('tel:+15551234')).toEqual({})
  })

  test('returns target+rel for external http(s)', () => {
    expect(getNavLinkTargetAttrs('https://example.com')).toEqual({
      target: '_blank',
      rel: 'noopener noreferrer',
    })
  })

  test('returns target+rel for same-site PDF (document overrides same-site)', () => {
    expect(
      getNavLinkTargetAttrs('https://www.springfieldcommonwealthacademy.org/files/handbook.pdf')
    ).toEqual({
      target: '_blank',
      rel: 'noopener noreferrer',
    })
  })

  test('returns target+rel for relative PDF', () => {
    expect(getNavLinkTargetAttrs('/files/handbook.pdf')).toEqual({
      target: '_blank',
      rel: 'noopener noreferrer',
    })
  })

  test('returns target+rel for Sanity CDN file', () => {
    expect(
      getNavLinkTargetAttrs('https://cdn.sanity.io/files/wesg5rw8/production/abc.pdf')
    ).toEqual({
      target: '_blank',
      rel: 'noopener noreferrer',
    })
  })
})
