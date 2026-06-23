import { defineType, defineField } from 'sanity'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  // @ts-expect-error - experimental Sanity feature for singleton documents
  __experimental_actions: ['update', 'publish'],
  fields: [
    defineField({
      name: 'schoolName',
      title: 'School Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
    }),
    defineField({
      name: 'address',
      title: 'Address',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'phone',
      title: 'Phone',
      type: 'string',
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
    }),
    defineField({
      name: 'enrollmentUrl',
      title: 'Enrollment URL',
      type: 'url',
      description: 'Gradelink EnrollMe URL',
    }),
    defineField({
      name: 'athleticAdmissionsEmail',
      title: 'Athletic Admissions Contact',
      type: 'string',
    }),
    defineField({
      name: 'internationalAdmissionsEmail',
      title: 'International Admissions Contact',
      type: 'string',
    }),
    defineField({
      name: 'accreditations',
      title: 'Accreditations',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'socialLinks',
      title: 'Social Links',
      type: 'array',
      of: [{ type: 'socialLink' }],
    }),
    defineField({
      name: 'announcement',
      title: 'Announcement Banner',
      type: 'announcement',
    }),
    defineField({
      name: 'defaultSeo',
      title: 'Default SEO',
      type: 'seo',
      description: 'Fallback SEO values for pages without custom settings',
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Site Settings' }
    },
  },
})
