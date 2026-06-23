import { defineType, defineField, defineArrayMember } from 'sanity'
import { BarChartIcon } from '@sanity/icons'

export const statsRow = defineType({
  name: 'statsRow',
  title: 'Stats Row',
  type: 'object',
  icon: BarChartIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
    }),
    defineField({
      name: 'stats',
      title: 'Stats',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'value',
              title: 'Value',
              type: 'string',
              description: 'The number or stat (e.g. "95%", "1:8", "200+")',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              description: 'What the stat represents',
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: { title: 'value', subtitle: 'label' },
          },
        }),
      ],
      validation: (rule) => rule.min(2).max(6),
    }),
    defineField({
      name: 'variant',
      title: 'Color Variant',
      type: 'string',
      options: {
        list: [
          { title: 'Navy (Dark)', value: 'navy' },
          { title: 'Light', value: 'light' },
        ],
        layout: 'radio',
      },
      initialValue: 'navy',
    }),
  ],
  preview: {
    select: { title: 'heading', stat0: 'stats.0.value' },
    prepare({ title, stat0 }) {
      return {
        title: title || stat0 || 'Stats',
        subtitle: 'Stats Row',
        media: BarChartIcon,
      }
    },
  },
})
