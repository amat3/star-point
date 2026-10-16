// Title of the weekly mixing. The public demo has its own, from Springfield, so nothing of the real
// group shows up there (the seed script writes the same one into the demo database).
export const GROUP_MIXING_TITLE = 'Mixing Padel y Risas'
export const DEMO_MIXING_TITLE = 'Mixing de Springfield'

export const MIXING_TITLE = process.env.NEXT_PUBLIC_DEMO === 'true' ? DEMO_MIXING_TITLE : GROUP_MIXING_TITLE
