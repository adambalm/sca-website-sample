import { defineType, defineField } from 'sanity'

export const announcement = defineType({
  name: 'announcement',
  title: 'Site Announcement',
  type: 'object',
  description: 'Banner displayed at top of site',
  fields: [
    defineField({
      name: 'enabled',
      title: 'Show Announcement',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'text',
      title: 'Announcement Text',
      type: 'string',
    }),
    defineField({
      name: 'link',
      title: 'Link',
      type: 'url',
      description: 'Optional link for the announcement',
    }),
  ],
})
