import { defineType, defineField } from 'sanity'

function inclusiveBusinessDays(startStr: string, endStr: string): number {
  const start = new Date(`${startStr}T00:00:00`)
  const end = new Date(`${endStr}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  if (end < start) return 0
  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

export const jobPosting = defineType({
  name: 'jobPosting',
  title: 'Job Posting',
  type: 'document',
  fields: [
    defineField({
      name: 'positionTitle',
      title: 'Position Title',
      type: 'string',
      description: 'Shown as the page headline. e.g. "Director of College Counseling and International Programs".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'positionTitle', maxLength: 96 },
      description: 'Auto-generated from the position title. Changing this will break links to a published posting.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'postingType',
      title: 'Type of posting',
      type: 'string',
      options: {
        list: [
          { title: 'Standard opening', value: 'standard' },
          { title: 'Public notice (compliance posting)', value: 'notice' },
        ],
        layout: 'radio',
      },
      initialValue: 'notice',
      description: 'Public notices have additional required fields and a minimum 10-business-day visibility window. Standard openings are ordinary job listings.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'postingStartDate',
      title: 'Posting start date',
      type: 'date',
      description: 'First day the posting is visible to the public.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'postingEndDate',
      title: 'Posting end date',
      type: 'date',
      description: 'Last day the posting is visible. For public notices, must be at least 10 business days (weekdays) after the start date. Holidays during the window are the operator\'s responsibility.',
      validation: (rule) =>
        rule.required().custom((endDate, context) => {
          if (!endDate) return true
          const doc = context.document as
            | { postingStartDate?: string; postingType?: string }
            | undefined
          const start = doc?.postingStartDate
          if (!start) return true
          const endStr = String(endDate)
          if (new Date(`${endStr}T00:00:00`) < new Date(`${start}T00:00:00`)) {
            return 'End date must be on or after the start date.'
          }
          if (doc?.postingType === 'notice') {
            const days = inclusiveBusinessDays(start, endStr)
            if (days < 10) {
              return `Public notices must remain visible for at least 10 business days. The current window covers ${days} weekday(s). Pick a later end date.`
            }
          }
          return true
        }),
    }),
    defineField({
      name: 'worksiteAddress',
      title: 'Worksite address',
      type: 'string',
      description: 'Street address where the role is based. e.g. "1 Ames Hill Drive, Springfield, MA 01105".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'salary',
      title: 'Salary',
      type: 'string',
      description: 'Free text. Single figure or range. e.g. "$76,200/year" or "$60,000–$72,000 per year".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'applicationEmail',
      title: 'Application email',
      type: 'string',
      description: 'Where applicants should send a resume.',
      validation: (rule) => rule.required().email(),
    }),
    defineField({
      name: 'duties',
      title: 'Position duties',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'One duty per item. Plain text — no formatting. Add items in the order they should be read on the page.',
      validation: (rule) => rule.required().min(1).error('Add at least one duty.'),
    }),
    defineField({
      name: 'requirements',
      title: 'Requirements',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'One requirement per item. Plain text — no formatting.',
      validation: (rule) => rule.required().min(1).error('Add at least one requirement.'),
    }),
    defineField({
      name: 'noticeDocument',
      title: 'Posting document (PDF)',
      type: 'file',
      options: { accept: 'application/pdf' },
      description: 'Required for public notices (the canonical signed PDF). Optional for standard openings.',
      validation: (rule) =>
        rule.custom((value, context) => {
          const doc = context.document as { postingType?: string } | undefined
          if (doc?.postingType === 'notice' && !value?.asset) {
            return 'A PDF is required for public notices.'
          }
          return true
        }),
    }),
    defineField({
      name: 'archived',
      title: 'Archived',
      type: 'boolean',
      initialValue: false,
      description: 'When checked, the posting is hidden from the public /careers index but remains reachable at its direct URL (for audit retention).',
    }),
  ],
  orderings: [
    {
      title: 'Posting start (newest)',
      name: 'startDesc',
      by: [{ field: 'postingStartDate', direction: 'desc' }],
    },
    {
      title: 'Posting end (soonest)',
      name: 'endAsc',
      by: [{ field: 'postingEndDate', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      title: 'positionTitle',
      start: 'postingStartDate',
      end: 'postingEndDate',
      archived: 'archived',
    },
    prepare({ title, start, end, archived }) {
      const today = new Date().toISOString().slice(0, 10)
      let status = 'Draft'
      if (archived) status = 'Archived'
      else if (end && end < today) status = 'Closed'
      else if (start && start > today) status = `Upcoming — starts ${start}`
      else if (start && end) status = `Open — ends ${end}`
      return {
        title: title || 'Untitled posting',
        subtitle: status,
      }
    },
  },
})
