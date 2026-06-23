import { defineType, defineField } from 'sanity'
import { LaunchIcon } from '@sanity/icons'

export const ctaBanner = defineType({
  name: 'ctaBanner',
  title: 'CTA Banner',
  type: 'object',
  icon: LaunchIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'subtitle',
      title: 'Subtitle',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'variant',
      title: 'Color Variant',
      type: 'string',
      options: {
        list: [
          { title: 'Navy (Dark)', value: 'navy' },
          { title: 'Gold (Accent)', value: 'gold' },
          { title: 'Light', value: 'light' },
        ],
        layout: 'radio',
      },
      initialValue: 'navy',
    }),
    defineField({
      name: 'primaryCta',
      title: 'Primary Button',
      type: 'object',
      fields: [
        defineField({ name: 'label', type: 'string', title: 'Label' }),
        defineField({ name: 'href', type: 'string', title: 'URL' }),
      ],
    }),
    defineField({
      name: 'secondaryCta',
      title: 'Secondary Button',
      type: 'object',
      fields: [
        defineField({ name: 'label', type: 'string', title: 'Label' }),
        defineField({ name: 'href', type: 'string', title: 'URL' }),
      ],
    }),
  ],
  preview: {
    select: { title: 'heading' },
    prepare({ title }) {
      return {
        title: title || 'Untitled CTA',
        subtitle: 'CTA Banner',
        media: LaunchIcon,
      }
    },
  },
})
