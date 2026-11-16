// Title of the weekly mixing. The public demo has its own, from Springfield, so nothing of the real
// group shows up there (the seed script writes the same one into the demo database).
export const GROUP_MIXING_TITLE = 'Mixing Padel y Risas'
export const DEMO_MIXING_TITLE = 'Mixing de Springfield'

export const MIXING_TITLE = process.env.NEXT_PUBLIC_DEMO === 'true' ? DEMO_MIXING_TITLE : GROUP_MIXING_TITLE

// Header of a mixing's page when the event does not set its own (events.intro_eyebrow / intro_subtitle)
export const DEFAULT_EVENT_SUBTITLE = 'Partidos de nivel y cerveza garantizada.'
export const defaultEventEyebrow = (weekdayPlural: string) => `El plan de los ${weekdayPlural}`
// Longest custom header text the forms accept
export const INTRO_TEXT_MAX = 60

/** A custom header text as it is saved: trimmed, and null when empty (the default shows). */
export const cleanIntroText = (text?: string | null) => (text ?? '').trim().slice(0, INTRO_TEXT_MAX) || null
