import { defineType, defineField } from 'sanity'

export const admissionsPath = defineType({
  name: 'admissionsPath',
  title: 'Admissions Path',
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
    }),
    defineField({
      name: 'audience',
      title: 'Audience',
      type: 'string',
      options: {
        list: [
          { title: 'Student Athletes', value: 'athlete' },
          { title: 'International Students', value: 'international' },
          { title: 'Domestic Boarding', value: 'domestic' },
        ],
      },
    }),
    defineField({
      name: 'image',
      title: 'Featured Image',
      type: 'image',
      options: { hotspot: true },
      description: 'Hero or featured image for this admissions path',
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'body',
      title: 'Details',
      type: 'array',
      of: [{ type: 'block' }],
    }),
    defineField({
      name: 'applyUrl',
      title: 'Apply Link',
      type: 'url',
    }),
    defineField({
      name: 'contactEmail',
      title: 'Contact Email',
      type: 'string',
    }),
  ],
  preview: {
    select: { title: 'title', audience: 'audience', media: 'image' },
    prepare({ title, audience, media }) {
      return { title, subtitle: audience, media }
    },
  },
})
