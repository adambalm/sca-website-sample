import { defineType, defineField } from 'sanity'

export const news = defineType({
  name: 'news',
  title: 'News',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
      description: 'Auto-generated from title. Changing this will break existing links to this article.',
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'datetime',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 3,
      description: 'Brief summary for listings and social shares',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        { type: 'block' },
        { type: 'image', options: { hotspot: true } },
      ],
    }),
    defineField({
      name: 'image',
      title: 'Featured Image',
      type: 'image',
      options: { hotspot: true },
      description: '1200×630px landscape recommended. Shown on article page, news listings, and social share previews.',
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt Text',
          type: 'string',
          description: 'One sentence describing the image, for screen readers and SEO.',
          validation: (rule) => rule.required().warning('Alt text is required for accessibility.'),
        }),
      ],
    }),
    defineField({
      name: 'attachments',
      title: 'Attachments',
      type: 'array',
      description: 'PDFs, documents, or other files readers can download',
      of: [
        {
          type: 'file',
          fields: [
            defineField({
              name: 'label',
              title: 'Display Name',
              type: 'string',
              description: 'e.g. "Enrollment Form" or "Press Release"',
              validation: (rule) => rule.required(),
            }),
          ],
        },
      ],
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      description: 'Show on homepage or in featured sections',
      initialValue: false,
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
      options: {
        list: [
          { title: 'Manual', value: 'manual' },
          { title: 'Instagram', value: 'instagram' },
          { title: 'External', value: 'external' },
        ],
      },
      initialValue: 'manual',
      description: 'How this content was created (for n8n integration tracking)',
    }),
    defineField({
      name: 'externalUrl',
      title: 'External URL',
      type: 'url',
      description: 'Source URL if imported from external platform',
      hidden: ({ parent }) => parent?.source === 'manual',
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
    }),
    defineField({
      name: 'editorialFlags',
      title: 'Editorial Flags',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Date needs review', value: 'DATE_NEEDS_REVIEW' },
          { title: 'Summary needs review', value: 'SUMMARY_NEEDS_REVIEW' },
          { title: 'Image needs review', value: 'IMAGE_NEEDS_REVIEW' },
          { title: 'Image tiny', value: 'IMAGE_TINY' },
          { title: 'Image extreme aspect', value: 'IMAGE_EXTREME_ASPECT' },
          { title: 'Image large file', value: 'IMAGE_LARGE_FILE' },
          { title: 'Image missing', value: 'IMAGE_MISSING' },
        ],
      },
      description: 'Flags for editorial review (auto-set during imports)',
    }),
  ],
  orderings: [
    {
      title: 'Date (Newest)',
      name: 'dateDesc',
      by: [{ field: 'date', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'title', date: 'date', media: 'image' },
    prepare({ title, date, media }) {
      return {
        title,
        subtitle: date ? new Date(date).toLocaleDateString() : 'No date',
        media,
      }
    },
  },
})
