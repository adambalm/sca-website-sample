import {defineType, defineField} from 'sanity'
import {CalendarIcon} from '@sanity/icons'
import {EVENT_CATEGORIES} from '../constants/eventCategories'

export const upcomingEvents = defineType({
  name: 'upcomingEvents',
  title: 'Upcoming Events',
  type: 'object',
  icon: CalendarIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      initialValue: 'Upcoming Events',
    }),
    defineField({
      name: 'subtitle',
      title: 'Subtitle',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'filterByCategory',
      title: 'Filter by Category',
      type: 'string',
      description: 'Only show events in this category. Leave empty to show all.',
      options: {
        list: [
          {title: 'All', value: ''},
          ...EVENT_CATEGORIES,
        ],
      },
    }),
    defineField({
      name: 'maxEvents',
      title: 'Max Events to Show',
      type: 'number',
      initialValue: 6,
      validation: (rule) => rule.min(1).max(20),
    }),
  ],
  preview: {
    select: {title: 'heading', category: 'filterByCategory'},
    prepare({title, category}) {
      return {
        title: title || 'Upcoming Events',
        subtitle: category ? `Filtered: ${category}` : 'All categories',
        media: CalendarIcon,
      }
    },
  },
})
