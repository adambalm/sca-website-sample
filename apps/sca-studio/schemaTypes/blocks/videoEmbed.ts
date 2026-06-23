import {defineType, defineField} from 'sanity'
import {PlayIcon} from '@sanity/icons'
import {parseVideoEmbed} from '../../lib/video-embed'

export const videoEmbed = defineType({
  name: 'videoEmbed',
  title: 'Video Embed',
  type: 'object',
  icon: PlayIcon,
  description: 'Embed a YouTube or Vimeo video. Paste the public URL.',
  fields: [
    defineField({
      name: 'url',
      title: 'Video URL',
      type: 'url',
      description: 'YouTube or Vimeo URL. Example: https://www.youtube.com/watch?v=…',
      validation: (rule) =>
        rule
          .required()
          .uri({scheme: ['http', 'https']})
          .custom((value) => {
            if (!value) return true
            const r = parseVideoEmbed(value)
            return 'error' in r ? r.error : true
          }),
    }),
    defineField({
      name: 'title',
      title: 'Accessible title',
      type: 'string',
      description: 'Short description used by screen readers (iframe title attribute).',
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
      description: 'Optional caption shown under the video.',
    }),
    defineField({
      name: 'aspectRatio',
      title: 'Aspect ratio',
      type: 'string',
      initialValue: '16/9',
      options: {
        list: [
          {title: '16:9 (widescreen)', value: '16/9'},
          {title: '9:16 (vertical)', value: '9/16'},
          {title: '4:3 (classic)', value: '4/3'},
        ],
        layout: 'radio',
      },
    }),
  ],
  preview: {
    select: {title: 'caption', subtitle: 'url'},
    prepare({title, subtitle}) {
      return {
        title: title || 'Video Embed',
        subtitle: subtitle || '(no URL)',
        media: PlayIcon,
      }
    },
  },
})
