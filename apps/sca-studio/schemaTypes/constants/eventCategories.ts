/**
 * Shared event category options used by both the event document
 * and the upcomingEvents page-builder block.
 *
 * Single source of truth — update here to add/modify categories.
 */
export const EVENT_CATEGORIES = [
  { title: 'Academic', value: 'academic' },
  { title: 'Athletics', value: 'athletics' },
  { title: 'Admissions', value: 'admissions' },
  { title: 'Community', value: 'community' },
  { title: 'Holiday', value: 'holiday' },
] as const
