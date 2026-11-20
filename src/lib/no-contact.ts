import type { ExclusionRule } from '@/lib/mixing-algorithm'

/** Players among `others` that `playerId` has a no_contact exclusion with (never on the same court or match). */
export function noContactWith(exclusions: ExclusionRule[], playerId: string, others: string[]): string[] {
  return others.filter(other =>
    other !== playerId &&
    exclusions.some(ex =>
      ex.type === 'no_contact' &&
      ((ex.playerA === playerId && ex.playerB === other) || (ex.playerA === other && ex.playerB === playerId))
    )
  )
}
