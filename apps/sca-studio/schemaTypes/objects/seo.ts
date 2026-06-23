import { defineType, defineField } from 'sanity'

export const seo = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Meta Title',
      type: 'string',
      description: 'Override the page title for search engines',
    }),
    defineField({
      name: 'description',
      title: 'Meta Description',
      type: 'text',
      rows: 3,
      description: 'Brief description for search results (150-160 characters ideal)',
      validation: (rule) => rule.max(160).warning('Keep under 160 characters'),
    }),
    defineField({
      name: 'image',
      title: 'Social Share Image',
      type: 'image',
      description: 'Image displayed when shared on social media',
    }),
  ],
})
