import { defineType, defineField } from 'sanity'
import { ImageIcon } from '@sanity/icons'

export const heroSection = defineType({
  name: 'heroSection',
  title: 'Hero Section',
  type: 'object',
  icon: ImageIcon,
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow Text',
      type: 'string',
      description: 'Small text above the heading (e.g. "About SCA")',
    }),
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
      rows: 3,
    }),
    defineField({
      name: 'image',
      title: 'Background Image',
      type: 'image',
      options: { hotspot: true },
      description: 'Recommended: 1920×1080px or wider. Displays full-width with dark overlay.',
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt Text',
          type: 'string',
          description: 'One sentence describing the image, for screen readers and SEO.',
          validation: (rule) => rule.required().warning('Alt text is required for accessibility.'),
        }),
      ],
    }),
    defineField({
      name: 'overlayOpacity',
      title: 'Overlay Opacity',
      type: 'number',
      description: 'Dark overlay over the image (0 = transparent, 100 = fully dark). Default: 60',
      validation: (rule) => rule.min(0).max(100),
      initialValue: 60,
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
    select: { title: 'heading', media: 'image' },
    prepare({ title, media }) {
      return {
        title: title || 'Untitled Hero',
        subtitle: 'Hero Section',
        media: media ?? ImageIcon,
      }
    },
  },
})
