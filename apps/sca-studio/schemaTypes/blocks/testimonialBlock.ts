import { defineType, defineField } from 'sanity'
import { CommentIcon } from '@sanity/icons'

export const testimonialBlock = defineType({
  name: 'testimonialBlock',
  title: 'Testimonial',
  type: 'object',
  icon: CommentIcon,
  fields: [
    defineField({
      name: 'quote',
      title: 'Quote',
      type: 'text',
      rows: 4,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'role',
      title: 'Role / Title',
      type: 'string',
      description: 'e.g. "Parent, Class of 2025" or "Head of School"',
    }),
    defineField({
      name: 'image',
      title: 'Photo',
      type: 'image',
      options: { hotspot: true },
      description: 'Portrait or headshot. Recommended: square, at least 400×400px.',
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt Text',
          type: 'string',
          description: 'Describe this person for screen readers',
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'name', subtitle: 'role', media: 'image' },
    prepare({ title, subtitle, media }) {
      return {
        title: title || 'Untitled',
        subtitle: subtitle ? `Testimonial — ${subtitle}` : 'Testimonial',
        media: media ?? CommentIcon,
      }
    },
  },
})
