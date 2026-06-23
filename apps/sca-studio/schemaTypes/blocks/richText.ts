import { defineType, defineField } from 'sanity'
import { DocumentTextIcon } from '@sanity/icons'

export const richText = defineType({
  name: 'richText',
  title: 'Rich Text',
  type: 'object',
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      of: [
        { type: 'block' },
        { type: 'image', options: { hotspot: true } },
      ],
    }),
    defineField({
      name: 'maxWidth',
      title: 'Content Width',
      type: 'string',
      options: {
        list: [
          { title: 'Narrow (672px)', value: 'narrow' },
          { title: 'Wide (1024px)', value: 'wide' },
          { title: 'Full (1280px)', value: 'full' },
        ],
        layout: 'radio',
      },
      initialValue: 'narrow',
    }),
  ],
  preview: {
    select: { title: 'heading' },
    prepare({ title }) {
      return {
        title: title || 'Untitled',
        subtitle: 'Rich Text',
        media: DocumentTextIcon,
      }
    },
  },
})
