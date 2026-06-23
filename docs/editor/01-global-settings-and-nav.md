# Editor Guide: Global Settings and Navigation

**Audience:** Content editors with Editor role access to Sanity Studio.
**Studio URL:** https://your-project.sanity.studio
**Last verified:** 2026-04-20

## What lives where

Two pinned singleton documents in Studio control site-wide content:

| Document | Controls |
|---|---|
| **Site Settings** | School name, tagline, address, phone, email, enrollment URL, social links, announcement banner |
| **Homepage** | All homepage content — hero, stats, value props, programs, CTA |

Plus two navigation documents:

| Document | Controls |
|---|---|
| **Navigation › main** | Top header nav (About, Academics, Athletics, Student Life, Admissions, News, Calendar, Contact) |
| **Navigation › footer** | Footer link groups (Quick Links, Community, Contact) |

Find all four under **Settings** in the left sidebar of Studio.

## Changing the phone number, email, or address

1. Open Studio → **Settings** → **Site Settings**
2. Scroll to the field you want to change
3. Edit
4. Click **Publish**
5. Within 5 minutes, the change appears on every page (header, footer, structured data for search engines). No developer needed.

## Turning on an announcement banner (school cancelled, early release, etc.)

1. Open Studio → **Settings** → **Site Settings** → **Announcement Banner**
2. Set **Show Announcement** to on
3. Enter the text (e.g. "School closed today — snow day")
4. Optional: add a link (e.g. to a full notice)
5. Click **Publish**
6. Gold banner appears at the top of every page within 5 minutes
7. **To remove:** flip **Show Announcement** to off. Don't delete the text.

## Editing site navigation

1. Open Studio → **Settings** → **Navigation**
2. Click either **main** or **footer**
3. Drag-reorder items; click an item to edit its label or URL
4. To add a top-level item: **Add item**, set label + URL, drag to position
5. To add a dropdown child: open a parent item, **Add to Dropdown items**
6. Click **Publish**

**Rule:** always use relative URLs (`/about`, `/academics/signature`), not full `https://...`.

## How long do changes take to appear?

- SSR pages (everything dynamic — homepage, about, news, calendar): **up to 5 minutes** (edge cache expiry).
- To force an instant update: no current mechanism. Ask Ed.

## What NOT to edit without asking

- **Homepage › Hero Image**: changing requires re-tuning the hotspot/crop or heads get cut off. See Ed before changing.
- **Settings › Enrollment URL**: links to Gradelink. Only change if Gradelink URL changes.
- **Navigation**: removing a top-level item breaks inbound links. Confirm with Ed.

## When something doesn't appear after publish

1. Wait 5 minutes.
2. Hard-refresh (Cmd-Shift-R / Ctrl-Shift-R).
3. Check the URL you expected to change — is it the right one?
4. If still wrong: tell Ed. Include the page URL and the field you changed.

## Reference: what's hard-coded vs. CMS-driven

| Item | Source |
|---|---|
| Phone, email, address (visible on site and in Google results) | CMS (Site Settings) |
| Header + footer navigation | CMS (Navigation docs) |
| Announcement banner | CMS (Site Settings) |
| Homepage hero title, stats, value props, programs, CTA | CMS (Homepage) |
| News articles, events, about page content, program pages | CMS (dedicated documents) |
| Favicons, fonts, brand colors | Code (Ed) |
| Page layout, section spacing, button styles | Code (Ed) |
| URL structure, route names | Code (Ed) |

If it's content, it's in Sanity. If it's structure or style, it's in code. When in doubt, try Sanity first — if the field doesn't exist, it's code.
