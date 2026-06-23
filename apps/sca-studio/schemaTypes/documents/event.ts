import { defineType, defineField } from 'sanity'
import { EVENT_CATEGORIES } from '../constants/eventCategories'

export const event = defineType({
  name: 'event',
  title: 'Event',
  type: 'document',
  groups: [
    { name: 'details', title: 'Details', default: true },
    { name: 'content', title: 'Content' },
    { name: 'sync', title: 'Sync', hidden: true },
  ],
  fields: [
    // --- Details group ---
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'details',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'details',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'startDate',
      title: 'Start Date/Time',
      type: 'datetime',
      group: 'details',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'endDate',
      title: 'End Date/Time',
      type: 'datetime',
      group: 'details',
    }),
    defineField({
      name: 'allDay',
      title: 'All Day Event',
      type: 'boolean',
      group: 'details',
      initialValue: false,
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
      group: 'details',
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      group: 'details',
      options: {
        list: [...EVENT_CATEGORIES],
      },
    }),
    defineField({
      name: 'program',
      title: 'Program',
      type: 'reference',
      to: [{ type: 'program' }],
      group: 'details',
      description: 'Link to the program this event belongs to (e.g. Boys Basketball)',
    }),
    defineField({
      name: 'externalUrl',
      title: 'External Link',
      type: 'url',
      group: 'details',
      description: 'Registration link, Google Calendar link, or event website.',
    }),

    // --- Content group ---
    defineField({
      name: 'descriptionText',
      title: 'Short Description',
      type: 'text',
      rows: 3,
      group: 'content',
      description: 'Brief plain-text summary for calendar list views.',
    }),
    defineField({
      name: 'description',
      title: 'Rich Description',
      type: 'array',
      of: [{ type: 'block' }],
      group: 'content',
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: { hotspot: true },
      group: 'content',
      description: 'Event photo or flyer. Recommended: 1200×630px.',
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt Text',
          type: 'string',
          description: 'Describe the image for screen readers',
        }),
      ],
    }),

    // --- Sync group (hidden from editors) ---
    defineField({
      name: 'googleEventId',
      title: 'Google Calendar Event ID',
      type: 'string',
      group: 'sync',
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
      group: 'details',
      options: {
        list: [
          { title: 'Manual', value: 'manual' },
          { title: 'Google Calendar', value: 'google' },
        ],
      },
      initialValue: 'manual',
      readOnly: true,
    }),
  ],
  orderings: [
    {
      title: 'Date (Upcoming)',
      name: 'dateAsc',
      by: [{ field: 'startDate', direction: 'asc' }],
    },
  ],
  preview: {
    select: { title: 'title', date: 'startDate', category: 'category', source: 'source' },
    prepare({ title, date, category, source }) {
      const sourceLabel = source === 'google' ? ' 🔄' : ''
      return {
        title: `${title}${sourceLabel}`,
        subtitle: `${category || ''} • ${date ? new Date(date).toLocaleDateString() : ''}`,
      }
    },
  },
})
