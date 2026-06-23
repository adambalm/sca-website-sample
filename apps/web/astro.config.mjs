import { defineConfig } from 'astro/config'
import sanity from '@sanity/astro'
import vercel from '@astrojs/vercel'
import react from '@astrojs/react'

// Env-driven with a documented fallback so the repo is portable across projects.
const SANITY_PROJECT_ID = process.env.PUBLIC_SANITY_PROJECT_ID || 'wesg5rw8'
const SANITY_DATASET = process.env.PUBLIC_SANITY_DATASET || 'production'
const SANITY_STUDIO_URL =
  process.env.PUBLIC_SANITY_STUDIO_URL || 'https://your-project.sanity.studio'

export default defineConfig({
  adapter: vercel({
    isr: {
      // Cache SSR pages at the edge for 5 minutes. After expiry, next request
      // triggers a background re-render; stale page served until new one is ready.
      expiration: 300,
      // On-demand revalidation: send x-prerender-revalidate header with this token
      // to bust cache immediately. Set VERCEL_ISR_BYPASS_TOKEN in Vercel env vars.
      bypassToken: process.env.VERCEL_ISR_BYPASS_TOKEN,
      // Never cache API routes (form submissions, webhooks)
      exclude: [/^\/api\/.*/],
    },
  }),
  integrations: [
    react(),
    sanity({
      projectId: SANITY_PROJECT_ID,
      dataset: SANITY_DATASET,
      useCdn: true,
      apiVersion: '2024-01-01',
      stega: {
        studioUrl: SANITY_STUDIO_URL,
      },
    }),
  ],
  vite: {
    envDir: '../../',
    define: {
      'import.meta.env.PUBLIC_SANITY_VISUAL_EDITING_ENABLED': JSON.stringify(
        process.env.PUBLIC_SANITY_VISUAL_EDITING_ENABLED || 'false'
      ),
    },
  },
})
