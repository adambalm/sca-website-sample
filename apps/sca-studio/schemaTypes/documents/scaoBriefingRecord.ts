import { defineType, defineField, defineArrayMember } from 'sanity'
import { ClipboardIcon } from '@sanity/icons'

export const scaoBriefingRecord = defineType({
  name: 'scaoBriefingRecord',
  title: 'SCAO Briefing Record',
  type: 'document',
  icon: ClipboardIcon,
  groups: [
    { name: 'meta', title: 'Meeting Info', default: true },
    { name: 'questions', title: 'Questions & Answers' },
    { name: 'actionItems', title: 'Action Items' },
  ],
  fields: [
    // ── Meta ──
    defineField({
      name: 'meetingDate',
      title: 'Meeting Date',
      type: 'date',
      group: 'meta',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'participants',
      title: 'Participants',
      type: 'array',
      group: 'meta',
      of: [defineArrayMember({ type: 'string' })],
    }),
    defineField({
      name: 'meetingStatus',
      title: 'Meeting Status',
      type: 'string',
      group: 'meta',
      options: {
        list: [
          { title: 'Scheduled', value: 'scheduled' },
          { title: 'In Progress', value: 'in-progress' },
          { title: 'Complete', value: 'complete' },
        ],
        layout: 'radio',
      },
      initialValue: 'scheduled',
    }),
    defineField({
      name: 'summary',
      title: 'Meeting Summary',
      type: 'text',
      rows: 5,
      group: 'meta',
      description: 'High-level summary of outcomes and decisions',
    }),

    // ── Questions ──
    defineField({
      name: 'questions',
      title: 'Questions',
      type: 'array',
      group: 'questions',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'briefingQuestion',
          title: 'Question',
          fields: [
            defineField({
              name: 'questionNumber',
              title: 'Question #',
              type: 'number',
              validation: (rule) => rule.required().min(1).max(99),
            }),
            defineField({
              name: 'questionText',
              title: 'Question',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'priority',
              title: 'Priority',
              type: 'string',
              options: {
                list: [
                  { title: 'Critical', value: 'critical' },
                  { title: 'Normal', value: 'normal' },
                ],
                layout: 'radio',
              },
              initialValue: 'normal',
            }),
            defineField({
              name: 'owner',
              title: 'Owner',
              type: 'string',
              description: 'Who needs to answer this',
            }),
            defineField({
              name: 'status',
              title: 'Status',
              type: 'string',
              options: {
                list: [
                  { title: 'Unanswered', value: 'unanswered' },
                  { title: 'Discussed', value: 'discussed' },
                  { title: 'Resolved', value: 'resolved' },
                  { title: 'Deferred', value: 'deferred' },
                  { title: 'Action Needed', value: 'action-needed' },
                ],
              },
              initialValue: 'unanswered',
            }),
            defineField({
              name: 'answer',
              title: 'Answer',
              type: 'text',
              rows: 3,
            }),
            defineField({
              name: 'meetingNotes',
              title: 'Meeting Notes',
              type: 'text',
              rows: 3,
              description: 'Discussion notes, context, who said what',
            }),
          ],
          preview: {
            select: {
              num: 'questionNumber',
              text: 'questionText',
              status: 'status',
              priority: 'priority',
            },
            prepare({ num, text, status, priority }) {
              const statusEmoji = {
                'unanswered': '🔴',
                'discussed': '🔵',
                'resolved': '🟢',
                'deferred': '⚪',
                'action-needed': '🟡',
              }
              const icon = statusEmoji[status as keyof typeof statusEmoji] || '❓'
              const critical = priority === 'critical' ? ' [CRITICAL]' : ''
              return {
                title: `Q${num}${critical}: ${text}`,
                subtitle: `${icon} ${status || 'unanswered'}`,
              }
            },
          },
        }),
      ],
    }),

    // ── Action Items ──
    defineField({
      name: 'actionItems',
      title: 'Action Items',
      type: 'array',
      group: 'actionItems',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'actionItem',
          title: 'Action Item',
          fields: [
            defineField({
              name: 'description',
              title: 'Description',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'assignee',
              title: 'Assignee',
              type: 'string',
              options: {
                list: [
                  { title: 'Ed', value: 'Ed' },
                  { title: 'Colleague', value: 'Colleague' },
                  { title: 'Both', value: 'Both' },
                  { title: 'TBD', value: 'TBD' },
                ],
              },
            }),
            defineField({
              name: 'fromQuestion',
              title: 'From Question #',
              type: 'number',
              description: 'Which question this action item came from (if any)',
            }),
            defineField({
              name: 'done',
              title: 'Complete',
              type: 'boolean',
              initialValue: false,
            }),
            defineField({
              name: 'dueDate',
              title: 'Due Date',
              type: 'date',
            }),
            defineField({
              name: 'notes',
              title: 'Notes',
              type: 'text',
              rows: 2,
            }),
          ],
          preview: {
            select: {
              description: 'description',
              assignee: 'assignee',
              done: 'done',
              fromQ: 'fromQuestion',
            },
            prepare({ description, assignee, done, fromQ }) {
              const check = done ? '✅' : '⬜'
              const source = fromQ ? ` (from Q${fromQ})` : ''
              return {
                title: `${check} ${description}`,
                subtitle: `${assignee || 'TBD'}${source}`,
              }
            },
          },
        }),
      ],
    }),

    // ── Export Record ──
    defineField({
      name: 'exportedMarkdown',
      title: 'Exported Markdown',
      type: 'text',
      rows: 10,
      group: 'meta',
      description: 'Auto-generated from the dashboard export button. Serves as a snapshot.',
      readOnly: true,
    }),
    defineField({
      name: 'googleSheetUrl',
      title: 'Google Sheet URL',
      type: 'url',
      group: 'meta',
      description: 'Link to the exported Google Sheet (if synced)',
    }),
  ],

  preview: {
    select: {
      meetingDate: 'meetingDate',
      meetingStatus: 'meetingStatus',
      participants: 'participants',
    },
    prepare({ meetingDate, meetingStatus, participants }) {
      const date = meetingDate || 'No date set'
      const statusLabel = {
        'scheduled': '📅 Scheduled',
        'in-progress': '🔄 In Progress',
        'complete': '✅ Complete',
      }
      return {
        title: `Briefing — ${date}`,
        subtitle: `${statusLabel[meetingStatus as keyof typeof statusLabel] || meetingStatus} — ${(participants || []).join(', ')}`,
      }
    },
  },
})
