# Editor Recipe: Featured News + Soccer Page

**Last verified:** 2026-04-21

Three things to get done:

- **A.** Publish a news article and feature it on the homepage.
- **B.** Create a Boys Soccer program page by duplicating Boys Basketball.
- **C.** Add Boys Soccer to the site nav.

Studio validation enforces URL formats and prompts for alt text, so this is mostly text, photos, and decisions.

---

## Before opening Studio

Have the materials ready. If anything is missing, chase it down first — editing is faster when you're not context-switching to find assets.

**For the news article:** headline, summary (1–3 sentences), body copy, a 1200×630 featured image.

**For the soccer page:** decided page name (Boys / Girls / just Soccer), the new coach's name + role + bio (2–3 paragraphs), coach headshot (square, 400×400+), a wide team or action photo (1920×1080+, room for text overlay), optional roster URL.

Put all files for one recipe in one folder on your desktop before starting. Descriptive filenames.

---

## URLs

- **Studio:** <https://your-project.sanity.studio>
- **Live:** <https://www.springfieldcommonwealthacademy.org>
- **Preview (renders drafts):** <https://sca-website-git-preview-ed-oconnells-projects.vercel.app>

Published changes reach Live within 5 minutes. Preview shows drafts immediately.

---

## A. News article, featured on the homepage

1. Studio → **Content** → **News** → **Create**.
2. Fill in Title, Date, Summary, Body, Featured Image (set alt text when prompted, drag the hotspot to the focal point). Toggle **Featured** on.
3. Publish.

The homepage shows the 3 most recent articles flagged Featured. To make sure yours is top, either give it the newest date, or open the previously-featured article ("SCA Launches New Website") and toggle its Featured off.

**Share URL:** `https://www.springfieldcommonwealthacademy.org/news/{slug}`. Social previews pull from Title, Summary, and Featured Image automatically — those three fields are your social card.

---

## B. Soccer program page (duplicate Basketball)

1. Studio → **People & Programs** → **Programs** → **Boys Basketball**.
2. Top-right `⋯` menu → **Duplicate**. A new draft appears with every field pre-filled.
3. **Change identity first so you don't confuse it with Basketball:**
   - **Name** → your soccer page name.
   - **Slug** → click **Generate** to regenerate from the new name.
   - **Head Coach** → click **×** to unlink Tony Bergeron. Then either leave empty or click **Create new** to add the new coach as a Person doc (name, role, photo, email, bio).
   - Clear the **College Placement Summary** field.
4. **Edit the four sections** — each expands with a click:
   - **Hero:** change heading and subtitle; replace the background image; decide what to do with the secondary button (delete it, or repoint to a coach email or roster URL — basketball's alumni link won't make sense for soccer).
   - **Coach (Head Coach Tony Bergeron):** change the heading to the new coach's name/title, upload their headshot, replace the bio text.
   - **Where They Played Next (card grid):** likely delete via the section's `⋯` → Remove. Keep only if you have soccer-specific content to put in the cards.
   - **See Where They Went (CTA banner):** update or delete along with the card grid above.
5. Click **Presentation** at the top to split-view Studio + draft preview. Scroll through your draft.
6. Publish.

The page is live at `/boys-soccer` (or whatever slug you set) within 5 minutes.

---

## C. Nav entry

1. Studio → **Settings** → **Navigation** → **main**.
2. Expand **Athletics**. In **Dropdown Items**, **Add item**.
3. Label: `Boys Soccer`. URL: `/boys-soccer` (must match the program slug exactly; Studio will reject malformed URLs).
4. Drag into position.
5. Publish the navigation document. (Publishing the program and publishing the nav are separate — both required.)

---

## Image handling (shared across all recipes)

- Click the image field → drag-drop or **Upload**. Reuse existing images via **Select**.
- **Alt text**: click the image to open its details, write one sentence. Studio will warn you if you skip it.
- **Hotspot** (for heroes and wide images): click image → **Edit hotspot and crop** → drag the center dot onto the subject's face or focal point → Close. This keeps the important part visible when the page crops the image for different screen widths.
- Aspect ratios: the field's description in Studio tells you what's recommended.

---

## Previewing and the 5-minute delay

The live site caches every page for 5 minutes. After publish, hard-refresh (Ctrl/Cmd-Shift-R) or use incognito to bypass your own browser cache. The Preview URL skips the cache entirely — use it for reviewing drafts.

---

## If something doesn't look right

Check it in Preview first; if the draft renders correctly there, it's just cache — wait 5 minutes. If Preview also looks wrong, check the field that drives the part that's off. If that doesn't resolve it, ask Ed.

---

## Sanity reference (when you want to go deeper)

- [Content operators cheatsheet](https://www.sanity.io/docs/user-guides/content-operations-cheatsheet)
- [Manage assets](https://www.sanity.io/docs/content-lake/manage-assets)
- [Compare document versions](https://www.sanity.io/docs/studio/compare-document-versions)
