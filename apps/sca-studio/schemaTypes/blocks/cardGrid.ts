import { defineType, defineField, defineArrayMember } from 'sanity'
import { ThListIcon } from '@sanity/icons'

export const cardGrid = defineType({
  name: 'cardGrid',
  title: 'Card Grid',
  type: 'object',
  icon: ThListIcon,
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
      name: 'cards',
      title: 'Cards',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'icon',
              title: 'Icon',
              type: 'string',
              description: 'Optional decorative icon displayed on the card.',
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
            defineField({
              name: 'image',
              title: 'Image',
              type: 'image',
              options: { hotspot: true },
            }),
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'description',
              title: 'Description',
              type: 'text',
              rows: 3,
            }),
            defineField({
              name: 'href',
              title: 'Link URL',
              type: 'string',
            }),
          ],
          preview: {
            select: { title: 'title', media: 'image' },
            prepare({ title, media }) {
              return { title: title || 'Untitled Card', media }
            },
          },
        }),
      ],
      validation: (rule) => rule.min(1),
    }),
  ],
  preview: {
    select: { title: 'heading', card0: 'cards.0.title' },
    prepare({ title, card0 }) {
      return {
        title: title || card0 || 'Untitled',
        subtitle: 'Card Grid',
        media: ThListIcon,
      }
    },
  },
})
