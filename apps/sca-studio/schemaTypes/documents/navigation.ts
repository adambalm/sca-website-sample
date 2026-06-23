import { defineType, defineField } from 'sanity'

export const navigation = defineType({
  name: 'navigation',
  title: 'Navigation',
  type: 'document',
  fields: [
    defineField({
      name: 'identifier',
      title: 'Identifier',
      type: 'string',
      description:
        'Which navigation this controls. Locked once published — the website queries by this identifier.',
      options: {
        list: [
          { title: 'Main (header)', value: 'main' },
          { title: 'Footer', value: 'footer' },
        ],
        layout: 'radio',
      },
      readOnly: ({ document }) =>
        !!document?._id && !document._id.startsWith('drafts.'),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'items',
      title: 'Navigation Items',
      type: 'array',
      description:
        'Top-level navigation items. Drag to reorder. In the footer document, the parent Label becomes a column header and Dropdown Items become the visible links — a parent without dropdown items will not render in the footer.',
      validation: (rule) =>
        rule
          .min(1)
          .warning(
            'Navigation has no items — visitors will see the hardcoded fallback (main) or an empty footer.'
          ),
      of: [
        {
          type: 'object',
          name: 'navItem',
          title: 'Nav Item',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              description:
                'Visible text shown to visitors. Keep short; long labels wrap awkwardly on smaller screens.',
              validation: (rule) =>
                rule
                  .required()
                  .max(40)
                  .warning(
                    'Labels over 40 characters may wrap or push other items off the row.'
                  ),
            }),
            defineField({
              name: 'href',
              title: 'URL',
              type: 'string',
              description:
                'Internal links start with / (e.g. /about) — open in the same tab. External https:// links and PDF documents open in a new tab automatically. Use mailto: for email and tel: for phone numbers.',
              validation: (rule) =>
                rule
                  .required()
                  .custom((value) => {
                    if (!value) return true
                    if (value.startsWith('/')) return true
                    if (value.startsWith('https://')) return true
                    if (value.startsWith('mailto:')) return true
                    if (value.startsWith('tel:')) return true
                    return 'URL must start with / (internal), https:// (external), mailto: or tel:.'
                  }),
            }),
            defineField({
              name: 'children',
              title: 'Dropdown Items',
              type: 'array',
              description:
                'Dropdown items. On desktop they appear on hover; on mobile they appear indented under the parent. Maximum nesting is one level — sub-items cannot have their own children.',
              of: [
                {
                  type: 'object',
                  name: 'navSubItem',
                  title: 'Sub Item',
                  fields: [
                    defineField({
                      name: 'label',
                      title: 'Label',
                      type: 'string',
                      description:
                        'Visible text shown to visitors. Keep short; long labels wrap awkwardly on smaller screens.',
                      validation: (rule) =>
                        rule
                          .required()
                          .max(40)
                          .warning(
                            'Labels over 40 characters may wrap or push other items off the row.'
                          ),
                    }),
                    defineField({
                      name: 'href',
                      title: 'URL',
                      type: 'string',
                      description:
                        'Internal links start with / (e.g. /about) — open in the same tab. External https:// links and PDF documents open in a new tab automatically. Use mailto: for email and tel: for phone numbers.',
                      validation: (rule) =>
                        rule
                          .required()
                          .custom((value) => {
                            if (!value) return true
                            if (value.startsWith('/')) return true
                            if (value.startsWith('https://')) return true
                            if (value.startsWith('mailto:')) return true
                            if (value.startsWith('tel:')) return true
                            return 'URL must start with / (internal), https:// (external), mailto: or tel:.'
                          }),
                    }),
                  ],
                  preview: {
                    select: { title: 'label', subtitle: 'href' },
                  },
                },
              ],
            }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'href' },
          },
        },
      ],
    }),
  ],
  preview: {
    select: { title: 'identifier' },
    prepare({ title }) {
      return { title: `Navigation: ${title}` }
    },
  },
})
