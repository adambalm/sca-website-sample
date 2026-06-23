import { test } from '@playwright/test'
import path from 'path'

const screenshotDir = path.join(__dirname, 'screenshots')

const pages = [
  { name: 'homepage', path: '/' },
  { name: 'about', path: '/about' },
  { name: 'academics-signature', path: '/academics/signature' },
  { name: 'athletics-philosophy', path: '/athletics/philosophy' },
  { name: 'admissions', path: '/admissions' },
]

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 375, height: 812 },
]

for (const pg of pages) {
  for (const vp of viewports) {
    test(`baseline screenshot: ${pg.name} @ ${vp.name} (${vp.width}x${vp.height})`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      })
      const page = await context.newPage()

      await page.goto(pg.path, { waitUntil: 'networkidle', timeout: 30000 })

      // Wait a bit for fonts and images to settle
      await page.waitForTimeout(1000)

      await page.screenshot({
        path: path.join(screenshotDir, `${pg.name}-${vp.name}-${vp.width}x${vp.height}.png`),
        fullPage: true,
      })

      await context.close()
    })
  }
}
