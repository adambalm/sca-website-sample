import { sanityClient } from 'sanity:client'
import imageUrlBuilder from '@sanity/image-url'

const builder = imageUrlBuilder(sanityClient)

export function urlFor(source: any) {
  return builder.image(source)
}

/**
 * Generate a srcset string for responsive hero images.
 * Sanity's CDN handles resizing via the ?w= parameter.
 */
const HERO_WIDTHS = [640, 1024, 1440, 1920]

export function heroSrcSet(source: any): string {
  return HERO_WIDTHS
    .map(w => `${urlFor(source).width(w).auto('format').url()} ${w}w`)
    .join(', ')
}

/**
 * Convert Sanity hotspot {x, y} (0-1 normalized) to CSS object-position.
 * Default biases toward top of image where heads typically are.
 */
export function hotspotToPosition(hotspot?: { x: number; y: number } | null): string {
  if (hotspot) {
    return `${(hotspot.x * 100).toFixed(1)}% ${(hotspot.y * 100).toFixed(1)}%`
  }
  return 'center 20%'
}
