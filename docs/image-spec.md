# SCA Website — Image Specification

Standard aspect ratios and dimensions for all image slots on the site.
Upload images **at or above** the listed source dimensions for best quality.

## Standard Aspect Ratios

| Token | Ratio | Source Size (2x retina) | Used For |
|-------|-------|------------------------|----------|
| `--aspect-hero` | **2:1** | 1920 × 960 px | Homepage hero, section hero banners |
| `--aspect-banner` | **5:2** (2.5:1) | 1600 × 640 px | Interior page headers, news article hero |
| `--aspect-card` | **3:2** | 600 × 400 px | News cards, card grid thumbnails |
| `--aspect-split` | **4:3** | 1200 × 900 px | Text + image two-column sections |
| (no token) | **1:1** | 400 × 400 px min | Profile/testimonial photos (displayed circular) |

These are defined as CSS custom properties in `global.css`. All image containers
across the site reference these tokens, so changing a ratio updates every instance.

## Where Each Ratio Is Used

### 2:1 — Hero (`--aspect-hero`)
- `HeroSection.astro` — full-width hero sections on pages like About, Admissions
- Homepage hero (text-only currently, but the container supports images)
- **Photography notes:** Landscape orientation. Subject should be centered or slightly above center. Works well with campus exterior shots, group photos, aerial views.

### 5:2 — Banner (`--aspect-banner`)
- Interior page headers on classic (non-sectioned) pages and program pages
- News article hero image
- **Photography notes:** Wide cinematic strip. Subject should be in the center third. This ratio crops heavily top and bottom — avoid images where important content is at the edges. Best for: campus views, activity shots, facility exteriors.

### 3:2 — Card (`--aspect-card`)
- `NewsCard.astro` — news listing and homepage news section
- `CardGrid.astro` — card grids on sectioned pages (programs, features)
- **Photography notes:** Standard landscape. Most camera photos are naturally 3:2 or 4:3, so minimal cropping needed. Good for: event photos, headshots with context, classroom scenes.

### 4:3 — Split (`--aspect-split`)
- `TextWithImage.astro` — two-column text+image sections
- **Photography notes:** Slightly taller than cards. Good for portraits, detailed shots, images that need more vertical space. In a two-column layout this occupies ~50% of viewport width.

### 1:1 — Profile
- `TestimonialBlock.astro` — testimonial author photos (displayed at 56px, circular)
- **Photography notes:** Square crop, face centered. Upload at minimum 400×400px.

## File Format & Size Guidelines

| Type | Format | Max File Size | Notes |
|------|--------|---------------|-------|
| Hero/Banner | WebP or JPEG | 500 KB | Sanity CDN auto-converts to WebP |
| Card thumbnail | WebP or JPEG | 200 KB | Sanity resizes via URL parameters |
| Profile photo | WebP or JPEG | 100 KB | Small display size, keep light |
| Inline body image | WebP or JPEG | 300 KB | Rendered at max 780px wide |

Sanity's image CDN handles format conversion and resizing automatically via URL
parameters (e.g., `?w=600&h=400&fit=crop`). Upload the highest quality source
you have — the CDN handles optimization at delivery time.

## Professional Quality Checklist

Based on patterns from top boarding school websites (Andover, Choate, Deerfield,
Lawrenceville, Hotchkiss):

- [ ] All images in the same card grid use the **same aspect ratio** (never mix landscape + portrait)
- [ ] Images share a **consistent color temperature** (don't mix warm/cool photos on same page)
- [ ] No stock photography — use original campus/school photos
- [ ] Source images are **at least 2x the display size** (retina-ready)
- [ ] Faces are not cropped by the aspect ratio container (use Sanity hotspot if needed)
- [ ] No visible borders or drop shadows on photos (clean edge treatment)
- [ ] Interior page headers use photography **relevant to that section's content**

## Sanity Hotspot

When uploading images in Sanity Studio, use the **hotspot tool** to mark the focal
point of each image. This ensures `object-fit: cover` crops around the important
part of the image rather than defaulting to center.

This is especially important for:
- Portrait photos used in banner (5:2) containers — mark the face
- Group photos — mark the center of the group
- Facility shots — mark the building entrance or key feature
