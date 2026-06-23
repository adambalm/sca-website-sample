import { defineType, defineField } from 'sanity'

export const alumniStory = defineType({
  name: 'alumniStory',
  title: 'Alumni Story',
  type: 'document',
  groups: [
    {
      name: 'review',
      title: 'Review',
      default: true,
    },
    {
      name: 'details',
      title: 'Details',
    },
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required(),
      group: ['review', 'details'],
    }),
    defineField({
      name: 'needsCoachReview',
      title: 'Needs Coach Review',
      type: 'boolean',
      initialValue: false,
      description: 'Flag entries that need verification before publishing',
      group: 'review',
    }),
    defineField({
      name: 'coachNote',
      title: 'Coach Note',
      type: 'text',
      rows: 2,
      description: 'Internal note — not displayed on the website',
      group: 'review',
    }),
    defineField({
      name: 'university',
      title: 'University/College',
      type: 'string',
      group: ['review', 'details'],
    }),
    defineField({
      name: 'graduationYear',
      title: 'Graduation Year',
      type: 'number',
      validation: (rule) => rule.min(2000).max(2100),
      group: ['review', 'details'],
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (rule) => rule.required(),
      description: 'Auto-generated from name. Changing this will break existing links.',
      group: 'details',
    }),
    defineField({
      name: 'achievement',
      title: 'Achievement',
      type: 'text',
      rows: 2,
      description: 'Brief description of notable achievement',
      group: 'details',
    }),
    defineField({
      name: 'quote',
      title: 'Quote',
      type: 'text',
      rows: 3,
      description: 'Testimonial quote from the alumnus',
      group: 'details',
    }),
    defineField({
      name: 'story',
      title: 'Full Story',
      type: 'array',
      of: [{ type: 'block' }],
      group: 'details',
    }),
    defineField({
      name: 'photo',
      title: 'Photo',
      type: 'image',
      options: { hotspot: true },
      description: 'Portrait or headshot. Recommended: square, at least 400×400px.',
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt Text',
          type: 'string',
          description: 'Describe the image for screen readers',
        }),
      ],
      group: 'details',
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      initialValue: false,
      group: 'details',
    }),
    defineField({
      name: 'sport',
      title: 'Sport / Program',
      type: 'string',
      options: {
        list: [
          { title: 'Basketball', value: 'basketball' },
          { title: 'General', value: 'general' },
        ],
      },
      description: 'Categorize by sport or program area',
      group: 'details',
    }),
    defineField({
      name: 'externalUrl',
      title: 'External Profile URL',
      type: 'url',
      description: 'Link to college athletics bio or equivalent',
      group: 'details',
    }),
    defineField({
      name: 'coach',
      title: 'Coach',
      type: 'reference',
      to: [{ type: 'person' }],
      description: 'Recruiting or primary coach during this player\'s time at SCA',
      group: 'details',
    }),
  ],
  orderings: [
    {
      title: 'Graduation Year (Newest)',
      name: 'yearDesc',
      by: [{ field: 'graduationYear', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'name', year: 'graduationYear', university: 'university', sport: 'sport', media: 'photo' },
    prepare({ title, year, university, sport, media }) {
      const parts = [year || '', university || '', sport || ''].filter(Boolean)
      return {
        title,
        subtitle: parts.join(' • '),
        media,
      }
    },
  },
})
