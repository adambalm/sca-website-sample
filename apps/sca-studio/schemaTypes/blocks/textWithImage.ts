import { defineType, defineField } from 'sanity'
import { BlockContentIcon } from '@sanity/icons'

export const textWithImage = defineType({
  name: 'textWithImage',
  title: 'Text with Image',
  type: 'object',
  icon: BlockContentIcon,
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
      of: [{ type: 'block' }],
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'layout',
      title: 'Layout',
      type: 'string',
      options: {
        list: [
          { title: 'Standard (50/50)', value: 'standard' },
          { title: 'Portrait Sidebar (70/30)', value: 'portrait' },
        ],
        layout: 'radio',
      },
      initialValue: 'standard',
    }),
    defineField({
      name: 'orientation',
      title: 'Image Position',
      type: 'string',
      options: {
        list: [
          { title: 'Image Left', value: 'imageLeft' },
          { title: 'Image Right', value: 'imageRight' },
        ],
        layout: 'radio',
      },
      initialValue: 'imageRight',
    }),
  ],
  preview: {
    select: { title: 'heading', media: 'image' },
    prepare({ title, media }) {
      return {
        title: title || 'Untitled',
        subtitle: 'Text with Image',
        media: media ?? BlockContentIcon,
      }
    },
  },
})
