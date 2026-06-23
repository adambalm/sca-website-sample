import { defineType, defineField, defineArrayMember } from 'sanity'

export const homepageConfig = defineType({
  name: 'homepageConfig',
  title: 'Homepage Configuration',
  type: 'document',
  // @ts-expect-error - experimental Sanity feature for singleton documents
  __experimental_actions: ['update', 'publish'],
  fields: [
    // Section Builder (CMS-first layout, off by default)
    defineField({
      name: 'useSections',
      title: 'Use Section Builder',
      type: 'boolean',
      group: 'sections',
      initialValue: false,
      description:
        'When ON, the homepage renders the Page Sections list below instead of the legacy hero / stats / value props / programs / CTA fields. Leave OFF until sections are populated and parity-checked on preview.',
    }),
    defineField({
      name: 'sections',
      title: 'Page Sections',
      type: 'array',
      group: 'sections',
      description: 'CMS-driven page builder. Renders only when "Use Section Builder" is ON.',
      hidden: ({ document }) => !document?.useSections,
      of: [
        defineArrayMember({ type: 'heroSection' }),
        defineArrayMember({ type: 'textWithImage' }),
        defineArrayMember({ type: 'cardGrid' }),
        defineArrayMember({ type: 'ctaBanner' }),
        defineArrayMember({ type: 'richText' }),
        defineArrayMember({ type: 'statsRow' }),
        defineArrayMember({ type: 'testimonialBlock' }),
        defineArrayMember({ type: 'accordionSection' }),
        defineArrayMember({ type: 'upcomingEvents' }),
        defineArrayMember({ type: 'latestNews' }),
        defineArrayMember({ type: 'videoEmbed' }),
      ],
    }),

    // Hero Section
    defineField({
      name: 'heroEyebrow',
      title: 'Hero Eyebrow',
      type: 'string',
      group: 'hero',
    }),
    defineField({
      name: 'heroTitle',
      title: 'Hero Title',
      type: 'string',
      group: 'hero',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'heroSubtitle',
      title: 'Hero Subtitle',
      type: 'string',
      group: 'hero',
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero Background Image',
      type: 'image',
      options: { hotspot: true },
      group: 'hero',
      description: 'Recommended: 1920×1080px or wider. Displays as full-width background with dark overlay.',
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
      name: 'heroVideo',
      title: 'Hero Background Video',
      type: 'file',
      group: 'hero',
      description: 'Upload an MP4 video (max 10MB recommended). This will override the Hero Background Image on the homepage.',
      options: {
        accept: 'video/mp4'
      }
    }),
    defineField({
      name: 'heroPrimaryCta',
      title: 'Hero Primary CTA',
      type: 'object',
      group: 'hero',
      fields: [
        defineField({ name: 'label', title: 'Label', type: 'string' }),
        defineField({ name: 'href', title: 'URL', type: 'string' }),
      ],
    }),
    defineField({
      name: 'heroSecondaryCta',
      title: 'Hero Secondary CTA',
      type: 'object',
      group: 'hero',
      fields: [
        defineField({ name: 'label', title: 'Label', type: 'string' }),
        defineField({ name: 'href', title: 'URL', type: 'string' }),
      ],
    }),

    // Stats Bar
    defineField({
      name: 'stats',
      title: 'Stats Bar',
      type: 'array',
      group: 'stats',
      description: 'Key statistics displayed between hero and value props',
      of: [
        {
          type: 'object',
          name: 'stat',
          title: 'Stat',
          fields: [
            defineField({
              name: 'value',
              title: 'Value',
              type: 'string',
              description: 'e.g., "4:1", "15+", "100%"',
            }),
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              description: 'e.g., "Student-Teacher Ratio"',
            }),
          ],
          preview: {
            select: { title: 'value', subtitle: 'label' },
          },
        },
      ],
    }),

    // Value Propositions
    defineField({
      name: 'valueProps',
      title: 'Value Propositions',
      type: 'array',
      group: 'valueProps',
      of: [
        {
          type: 'object',
          name: 'valueProp',
          title: 'Value Prop',
          fields: [
            defineField({
              name: 'icon',
              title: 'Icon',
              type: 'string',
              description: 'Icon identifier (e.g., brain, book-open, trophy)',
              options: {
                list: [
                  { title: 'Brain (AI)', value: 'brain' },
                  { title: 'Book Open', value: 'book-open' },
                  { title: 'Trophy', value: 'trophy' },
                  { title: 'Graduation Cap', value: 'graduation-cap' },
                  { title: 'Users', value: 'users' },
                  { title: 'Globe', value: 'globe' },
                ],
              },
            }),
            defineField({ name: 'title', title: 'Title', type: 'string' }),
            defineField({ name: 'description', title: 'Description', type: 'string' }),
          ],
          preview: {
            select: { title: 'title', subtitle: 'description' },
          },
        },
      ],
    }),

    // Program Highlights
    defineField({
      name: 'programHighlights',
      title: 'Program Highlights',
      type: 'array',
      group: 'programs',
      of: [
        {
          type: 'object',
          name: 'programHighlight',
          title: 'Program',
          fields: [
            defineField({ name: 'title', title: 'Title', type: 'string' }),
            defineField({ name: 'description', title: 'Description', type: 'string' }),
            defineField({ name: 'href', title: 'Link URL', type: 'string' }),
            defineField({ name: 'cta', title: 'CTA Text', type: 'string' }),
          ],
          preview: {
            select: { title: 'title', subtitle: 'description' },
          },
        },
      ],
    }),

    // CTA Banner
    defineField({
      name: 'ctaTitle',
      title: 'CTA Title',
      type: 'string',
      group: 'cta',
    }),
    defineField({
      name: 'ctaSubtitle',
      title: 'CTA Subtitle',
      type: 'string',
      group: 'cta',
    }),
    defineField({
      name: 'ctaPrimaryCta',
      title: 'CTA Primary Button',
      type: 'object',
      group: 'cta',
      fields: [
        defineField({ name: 'label', title: 'Label', type: 'string' }),
        defineField({ name: 'href', title: 'URL', type: 'string' }),
      ],
    }),
    defineField({
      name: 'ctaSecondaryCta',
      title: 'CTA Secondary Button',
      type: 'object',
      group: 'cta',
      fields: [
        defineField({ name: 'label', title: 'Label', type: 'string' }),
        defineField({ name: 'href', title: 'URL', type: 'string' }),
      ],
    }),
  ],
  groups: [
    { name: 'sections', title: 'Sections (CMS Builder)', default: true },
    { name: 'hero', title: 'Hero (Legacy)' },
    { name: 'stats', title: 'Stats Bar (Legacy)' },
    { name: 'valueProps', title: 'Value Props (Legacy)' },
    { name: 'programs', title: 'Programs (Legacy)' },
    { name: 'cta', title: 'CTA Banner (Legacy)' },
  ],
  preview: {
    prepare() {
      return { title: 'Homepage Configuration' }
    },
  },
})
