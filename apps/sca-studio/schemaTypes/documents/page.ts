import { defineType, defineField, defineArrayMember } from 'sanity'

export const page = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  groups: [
    { name: 'sections', title: 'Content', default: true },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'sections',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'sections',
      options: {
        source: 'title',
        maxLength: 96,
        isUnique: (value, context) => context.defaultIsUnique(value, context),
      },
      validation: (rule) =>
        rule.required().custom((slug) => {
          const reserved = ['news', 'projects', 'admin', 'api', 'sitemap', 'summer-camp']
          if (slug?.current && reserved.includes(slug.current)) {
            return `"${slug.current}" is reserved and cannot be used as a page slug.`
          }
          return true
        }),
      description: 'Auto-generated from title. This becomes the page URL — changing it will break existing links.',
    }),
    defineField({
      name: 'parent',
      title: 'Parent Page',
      type: 'reference',
      group: 'sections',
      to: [{ type: 'page' }],
      description: 'Optional parent for nested pages (e.g., About > History)',
    }),
    defineField({
      name: 'image',
      title: 'Header Image',
      type: 'image',
      group: 'sections',
      options: { hotspot: true },
      description: 'Hero background image for the page header. Recommended: 1920×800px or wider, landscape orientation.',
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
      name: 'sections',
      title: 'Page Sections',
      type: 'array',
      group: 'sections',
      description: 'Build visual page layouts with structured sections.',
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
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
      group: 'seo',
    }),
  ],
  orderings: [
    {
      title: 'Title (A–Z)',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }],
    },
  ],
  preview: {
    select: { title: 'title', parent: 'parent.title' },
    prepare({ title, parent }) {
      return {
        title,
        subtitle: parent ? `↳ ${parent}` : undefined,
      }
    },
  },
})
