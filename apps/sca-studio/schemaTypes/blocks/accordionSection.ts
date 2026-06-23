import { defineType, defineField, defineArrayMember } from 'sanity'
import { MenuIcon } from '@sanity/icons'

export const accordionSection = defineType({
  name: 'accordionSection',
  title: 'Accordion / FAQ',
  type: 'object',
  icon: MenuIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
    }),
    defineField({
      name: 'subtitle',
      title: 'Subtitle',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'question',
              title: 'Question',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'answer',
              title: 'Answer',
              type: 'array',
              of: [{ type: 'block' }],
            }),
          ],
          preview: {
            select: { title: 'question' },
          },
        }),
      ],
      validation: (rule) => rule.min(1),
    }),
  ],
  preview: {
    select: { title: 'heading', item0: 'items.0.question' },
    prepare({ title, item0 }) {
      return {
        title: title || item0 || 'Untitled',
        subtitle: 'Accordion / FAQ',
        media: MenuIcon,
      }
    },
  },
})
