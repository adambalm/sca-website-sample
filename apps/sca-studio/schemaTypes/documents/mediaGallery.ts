import { defineType, defineField } from 'sanity'

export const mediaGallery = defineType({
  name: 'mediaGallery',
  title: 'Media Gallery',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            {
              name: 'caption',
              title: 'Caption',
              type: 'string',
            },
            {
              name: 'alt',
              title: 'Alt Text',
              type: 'string',
            },
          ],
        },
      ],
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Campus Life', value: 'campus' },
          { title: 'Athletics', value: 'athletics' },
          { title: 'Events', value: 'events' },
          { title: 'Academics', value: 'academics' },
          { title: 'Graduation', value: 'graduation' },
        ],
      },
    }),
  ],
  preview: {
    select: { title: 'title', date: 'date', images: 'images' },
    prepare({ title, date, images }) {
      return {
        title,
        subtitle: `${date || ''} • ${images?.length || 0} images`,
        media: images?.[0],
      }
    },
  },
})
