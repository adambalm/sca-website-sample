import { test } from '@playwright/test'
const PAGES = [
  { name: 'homepage', path: '/' },
  { name: 'about', path: '/about' },
  { name: 'about-history', path: '/about/history' },
  { name: 'about-vision', path: '/about/vision' },
  { name: 'about-guardian', path: '/about/guardian-alliance' },
  { name: 'academics', path: '/academics' },
  { name: 'academics-signature', path: '/academics/signature' },
  { name: 'academics-special', path: '/academics/special' },
  { name: 'academics-future', path: '/academics/future-study' },
  { name: 'athletics', path: '/athletics' },
  { name: 'athletics-philosophy', path: '/athletics/philosophy' },
  { name: 'athletics-ncaa', path: '/athletics/ncaa-pathway' },
  { name: 'student-life', path: '/student-life' },
  { name: 'admissions', path: '/admissions' },
  { name: 'news', path: '/news' },
  { name: 'contact', path: '/contact' },
  { name: 'engagement', path: '/engagement' },
]
for (const pg of PAGES) {
  test(`${pg.name}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const p = await ctx.newPage()
    await p.goto(pg.path)
    await p.waitForLoadState('networkidle')
    await p.screenshot({ path: `test-results/editorial-review/${pg.name}.png`, fullPage: false })
    await ctx.close()
  })
}
