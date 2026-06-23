import {defineType, defineField} from 'sanity'

export const studentProject = defineType({
  name: 'studentProject',
  title: 'Student Project',
  type: 'document',
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'publishing', title: 'Publishing'},
    {name: 'seo', title: 'SEO'},
    {name: 'provisioning', title: 'Provisioning'},
  ],
  fields: [
    // === CONTENT GROUP ===
    defineField({
      name: 'title',
      title: 'Project Title',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'student',
      title: 'Student',
      type: 'reference',
      to: [{type: 'person'}],
      group: 'content',
      description: 'Link to person record for the student',
    }),
    defineField({
      name: 'studentEmail',
      title: 'Student Email',
      type: 'string',
      group: 'content',
      description: 'Google Workspace email — student will be granted Editor access to their folder',
      validation: (rule) => rule.email(),
    }),
    defineField({
      name: 'program',
      title: 'Associated Program',
      type: 'reference',
      to: [{type: 'program'}],
      group: 'content',
      description: 'Academic or special program this project relates to',
    }),
    defineField({
      name: 'year',
      title: 'Academic Year',
      type: 'string',
      group: 'content',
      options: {
        list: [
          {title: '2025-2026', value: '2025-2026'},
          {title: '2024-2025', value: '2024-2025'},
          {title: '2023-2024', value: '2023-2024'},
        ],
      },
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      group: 'content',
      rows: 3,
      validation: (rule) => rule.max(300),
    }),
    defineField({
      name: 'body',
      title: 'Full Description',
      type: 'array',
      group: 'content',
      of: [{type: 'block'}],
    }),
    defineField({
      name: 'featuredImage',
      title: 'Featured Image',
      type: 'image',
      group: 'content',
      options: {hotspot: true},
      description: 'Recommended: 1200×630px. Used on project listing and detail pages.',
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt Text',
          type: 'string',
          description: 'Describe the image for screen readers',
        }),
      ],
    }),
    defineField({
      name: 'gallery',
      title: 'Project Gallery',
      type: 'array',
      group: 'content',
      of: [{type: 'image', options: {hotspot: true}}],
    }),
    defineField({
      name: 'externalUrl',
      title: 'External Link',
      type: 'url',
      group: 'content',
      description: 'Link to live project, GitHub repo, or presentation',
    }),
    defineField({
      name: 'featured',
      title: 'Featured Project',
      type: 'boolean',
      group: 'content',
      initialValue: false,
    }),

    // === PUBLISHING GROUP ===
    defineField({
      name: 'visibility',
      title: 'Website Visibility',
      type: 'string',
      group: 'publishing',
      options: {
        list: [
          {title: 'Private (not shown on website)', value: 'Private'},
          {title: 'Public (shown on /projects page)', value: 'Public'},
        ],
        layout: 'radio',
      },
      initialValue: 'Private',
      description:
        'Controls whether project METADATA appears on the public website. Does NOT affect Drive folder permissions.',
    }),

    // === SEO GROUP ===
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
      group: 'seo',
    }),

    // === PROVISIONING GROUP ===
    defineField({
      name: 'status',
      title: 'Provisioning Status',
      type: 'string',
      group: 'provisioning',
      options: {
        list: [
          {title: 'Pending', value: 'Pending'},
          {title: 'Provisioning', value: 'Provisioning'},
          {title: 'Complete', value: 'Complete'},
          {title: 'Error', value: 'Error'},
        ],
        layout: 'radio',
      },
      initialValue: 'Pending',
      readOnly: true,
      description: 'Managed by GAM automation — do not edit manually',
    }),
    defineField({
      name: 'idempotencyKey',
      title: 'Idempotency Key',
      type: 'string',
      group: 'provisioning',
      readOnly: true,
      hidden: true,
      description: 'Derived from Sanity _id — used to prevent duplicate folder creation',
    }),
    defineField({
      name: 'provisioningData',
      title: 'Provisioning Data',
      type: 'object',
      group: 'provisioning',
      readOnly: true,
      description: 'GAM response data — do not edit manually',
      fields: [
        defineField({
          name: 'driveFolderId',
          title: 'Drive Folder ID',
          type: 'string',
        }),
        defineField({
          name: 'driveFolderUrl',
          title: 'Drive Folder URL',
          type: 'url',
        }),
        defineField({
          name: 'sharedDriveId',
          title: 'Shared Drive ID',
          type: 'string',
          description: 'ID of the centralized Shared Drive',
        }),
        defineField({
          name: 'provisioningStartedAt',
          title: 'Provisioning Started At',
          type: 'datetime',
        }),
        defineField({
          name: 'provisionedAt',
          title: 'Provisioned At',
          type: 'datetime',
        }),
        defineField({
          name: 'errorMessage',
          title: 'Error Message',
          type: 'text',
          rows: 2,
        }),
        defineField({
          name: 'rawResponse',
          title: 'Raw GAM Response',
          type: 'text',
          rows: 4,
          description: 'JSON blob from GAM for debugging',
        }),
      ],
    }),
  ],
  orderings: [
    {
      title: 'Title (A–Z)',
      name: 'titleAsc',
      by: [{field: 'title', direction: 'asc'}],
    },
    {
      title: 'Newest Created',
      name: 'createdDesc',
      by: [{field: '_createdAt', direction: 'desc'}],
    },
  ],
  preview: {
    select: {
      title: 'title',
      student: 'student.name',
      program: 'program.name',
      status: 'status',
      visibility: 'visibility',
      media: 'featuredImage',
    },
    prepare({title, student, program, status, visibility, media}) {
      const statusEmoji =
        {
          Pending: '[Pending]',
          Provisioning: '[Provisioning]',
          Complete: '[Complete]',
          Error: '[Error]',
        }[status as string] || '[?]'
      const visLabel = visibility === 'Public' ? '[Public]' : '[Private]'
      return {
        title: `${statusEmoji}${visLabel} ${title}`,
        subtitle: [student, program].filter(Boolean).join(' - '),
        media,
      }
    },
  },
})
