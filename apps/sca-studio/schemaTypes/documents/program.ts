import { defineType, defineField, defineArrayMember } from 'sanity'

export const program = defineType({
  name: 'program',
  title: 'Program',
  type: 'document',
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'sections', title: 'Sections' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: { source: 'name', maxLength: 96 },
      validation: (rule) => rule.required(),
      description: 'Auto-generated from name. Changing this will break existing links.',
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      group: 'content',
      options: {
        list: [
          { title: 'Academic', value: 'academic' },
          { title: 'Athletic', value: 'athletic' },
          { title: 'Special Program', value: 'special' },
        ],
      },
    }),
    // Athletics-specific extensions (hidden unless category === athletic)
    defineField({
      name: 'level',
      title: 'Level',
      type: 'string',
      group: 'content',
      options: {
        list: [
          { title: 'Varsity', value: 'varsity' },
          { title: 'JV', value: 'jv' },
          { title: 'Development', value: 'development' },
        ],
      },
      hidden: ({ parent }) => parent?.category !== 'athletic',
    }),
    defineField({
      name: 'coach',
      title: 'Head Coach',
      type: 'reference',
      group: 'content',
      to: [{ type: 'person' }],
      hidden: ({ parent }) => parent?.category !== 'athletic',
    }),
    defineField({
      name: 'externalRosterUrl',
      title: 'Roster / Schedule URL',
      type: 'url',
      group: 'content',
      hidden: ({ parent }) => parent?.category !== 'athletic',
    }),
    defineField({
      name: 'collegePlacementSummary',
      title: 'College Placement Summary',
      type: 'text',
      group: 'content',
      rows: 3,
      hidden: ({ parent }) => parent?.category !== 'athletic',
    }),
    // Page builder sections (same as page.ts)
    defineField({
      name: 'sections',
      title: 'Page Sections',
      type: 'array',
      group: 'sections',
      description: 'Build visual page layouts with structured sections. Takes priority over Description when present.',
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
        defineArrayMember({ type: 'videoEmbed' }),
      ],
    }),
    // Shared fields
    defineField({
      name: 'description',
      title: 'Description',
      type: 'array',
      group: 'content',
      of: [{ type: 'block' }],
    }),
    defineField({
      name: 'image',
      title: 'Featured Image',
      type: 'image',
      group: 'content',
      options: { hotspot: true },
      description: 'Recommended: 1200×630px. Used on program listing and detail pages.',
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt Text',
          type: 'string',
          description: 'Describe the image for screen readers',
        }),
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
      title: 'Category, then Name',
      name: 'categoryName',
      by: [{ field: 'category', direction: 'asc' }, { field: 'name', direction: 'asc' }],
    },
    {
      title: 'Name (A–Z)',
      name: 'nameAsc',
      by: [{ field: 'name', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'category',
      media: 'image',
    },
  },
})
