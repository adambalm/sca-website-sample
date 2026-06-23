import { defineType, defineField } from 'sanity'

export const socialLink = defineType({
  name: 'socialLink',
  title: 'Social Link',
  type: 'object',
  fields: [
    defineField({
      name: 'platform',
      title: 'Platform',
      type: 'string',
      options: {
        list: [
          { title: 'Facebook', value: 'facebook' },
          { title: 'Instagram', value: 'instagram' },
          { title: 'X (Twitter)', value: 'twitter' },
          { title: 'LinkedIn', value: 'linkedin' },
          { title: 'YouTube', value: 'youtube' },
          { title: 'WeChat', value: 'wechat' },
          { title: 'WhatsApp', value: 'whatsapp' },
        ],
      },
    }),
    defineField({
      name: 'url',
      title: 'URL',
      type: 'url',
    }),
  ],
  preview: {
    select: { platform: 'platform', url: 'url' },
    prepare({ platform, url }) {
      return { title: platform, subtitle: url }
    },
  },
})
