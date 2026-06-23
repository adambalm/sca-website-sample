import { defineType, defineField } from 'sanity'
import { DocumentsIcon } from '@sanity/icons'

export const latestNews = defineType({
  name: 'latestNews',
  title: 'Latest News',
  type: 'object',
  icon: DocumentsIcon,
  description:
    'Auto-populated grid of the most recent news articles. Order: featured first, then by date descending.',
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      initialValue: 'Latest News',
    }),
    defineField({
      name: 'limit',
      title: 'Number of articles to show',
      type: 'number',
      initialValue: 3,
      validation: (rule) => rule.required().integer().min(1).max(12),
    }),
    defineField({
      name: 'ctaLabel',
      title: 'Footer CTA Label',
      type: 'string',
      initialValue: 'View All News',
      description: 'Text on the link below the grid. Leave blank to hide the CTA.',
    }),
    defineField({
      name: 'ctaHref',
      title: 'Footer CTA URL',
      type: 'string',
      initialValue: '/news',
    }),
  ],
  preview: {
    select: { title: 'heading', limit: 'limit' },
    prepare({ title, limit }) {
      return {
        title: title || 'Latest News',
        subtitle: limit ? `Latest News (${limit})` : 'Latest News',
        media: DocumentsIcon,
      }
    },
  },
})
