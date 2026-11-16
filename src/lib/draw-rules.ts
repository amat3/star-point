import {
  fixedPairFormat,
  scheduleFixedPairs,
  womenCourtSlots,
  type ExclusionRule,
  type FixedPair,
  type GenderMode,
  type MixingParticipant,
} from '@/lib/mixing-algorithm'

// One rule of an event's draw (table event_draw_rules), as the generator uses it:
//  - pair: playerA and playerB are partners once, in a round of the format their genders imply
//  - women_court: playerA, a man, may complete the women's court of the separated rounds (with any of these, only they)
export interface DrawRule {
  id: string
  kind: 'pair' | 'women_court'
  playerA: string
  playerB: string | null
  // Names as stored, so a rule about someone who is no longer a starter can still be shown and removed
  playerAName: string
  playerBName: string | null
}

export function rulesToConfig(rules: DrawRule[]): { fixedPairs: FixedPair[]; womenCourtMen: string[] } {
  return {
    fixedPairs: rules.flatMap(r => (r.kind === 'pair' && r.playerB ? [[r.playerA, r.playerB] as FixedPair] : [])),
    womenCourtMen: rules.filter(r => r.kind === 'women_court').map(r => r.playerA),
  }
}

const isWoman = (p: MixingParticipant) => p.gender === 'femenino'
const hasGender = (p: MixingParticipant) => p.gender === 'femenino' || p.gender === 'masculino'

/** What kind of match a fixed pair plays in: 'Mixta', 'Femenina' or 'Masculina'; null while a gender is missing. */
export function pairFormatLabel(a?: MixingParticipant, b?: MixingParticipant): string | null {
  if (!a || !b || !hasGender(a) || !hasGender(b)) return null
  if (isWoman(a) !== isWoman(b)) return 'Mixta'
  return isWoman(a) ? 'Femenina' : 'Masculina'
}

const FORMAT_NAME = { mixed: { one: 'mixta', many: 'mixtas' }, separated: { one: 'separada', many: 'separadas' } }

/**
 * What stops a draw with these rules (empty when nothing does): the assertions checked before generating, with
 * the players' names, for the generator. Rules whose players have no gender yet are left for later: the generator
 * already asks for those genders.
 */
export function ruleProblems(
  starters: MixingParticipant[],
  roundModes: GenderMode[],
  rules: DrawRule[],
  exclusions: ExclusionRule[] = []
): string[] {
  const problems: string[] = []
  const byId = new Map(starters.map(p => [p.id, p]))

  // Everyone in a rule must play
  const outside = new Map<string, string>()
  for (const rule of rules) {
    if (!byId.has(rule.playerA)) outside.set(rule.playerA, rule.playerAName)
    if (rule.playerB && !byId.has(rule.playerB)) outside.set(rule.playerB, rule.playerBName ?? '')
  }
  outside.forEach(name => problems.push(`${name} tiene una regla pero no es titular de este evento.`))

  for (const rule of rules) {
    const man = byId.get(rule.playerA)
    if (rule.kind === 'women_court' && man && isWoman(man)) {
      problems.push(`${man.full_name} está en la lista de la pista de chicas, pero es chica.`)
    }
  }

  const pairs = rules.flatMap(rule => {
    const a = byId.get(rule.playerA)
    const b = rule.kind === 'pair' && rule.playerB ? byId.get(rule.playerB) : undefined
    return a && b && hasGender(a) && hasGender(b) ? [{ rule, a, b, format: fixedPairFormat(a, b) }] : []
  })
  const roundsOf = {
    mixed: roundModes.filter(mode => mode === 'mixed').length,
    separated: roundModes.filter(mode => mode === 'separated').length,
  }

  for (const { a, b, format } of pairs) {
    if (roundsOf[format] === 0) {
      problems.push(`${a.full_name} + ${b.full_name} tienen que jugar juntos en una ronda ${FORMAT_NAME[format].one} y no hay ninguna.`)
    }
  }

  // Nobody can play more fixed pairs of a format than there are rounds of it
  const load = new Map<string, Record<'mixed' | 'separated', number>>()
  for (const { a, b, format } of pairs) {
    for (const id of [a.id, b.id]) {
      const counts = load.get(id) ?? { mixed: 0, separated: 0 }
      counts[format]++
      load.set(id, counts)
    }
  }
  load.forEach((counts, id) => {
    for (const format of ['mixed', 'separated'] as const) {
      const rounds = roundsOf[format]
      if (rounds > 0 && counts[format] > rounds) {
        problems.push(
          `${byId.get(id)!.full_name} tiene ${counts[format]} parejas fijas para rondas ${FORMAT_NAME[format].many} y solo hay ${rounds}.`
        )
      }
    }
  })

  for (const { a, b } of pairs) {
    const apart = exclusions.some(ex =>
      (ex.type === 'no_partner' || ex.type === 'no_contact') &&
      ((ex.playerA === a.id && ex.playerB === b.id) || (ex.playerA === b.id && ex.playerB === a.id))
    )
    if (apart) problems.push(`${a.full_name} + ${b.full_name} tienen una exclusión que les impide ser pareja.`)
  }

  const fixedPairs = pairs.map(({ a, b }) => [a.id, b.id] as FixedPair)
  const womenCourtMen = rules.filter(r => r.kind === 'women_court' && byId.has(r.playerA)).map(r => r.playerA)
  if (womenCourtMen.length > 0 && roundsOf.separated > 0) {
    const { needed, free, perRound } = womenCourtSlots(starters, roundModes, fixedPairs, womenCourtMen)
    if (free < needed) {
      const men = (count: number) => `${count} ${count === 1 ? 'chico' : 'chicos'}`
      const marked = womenCourtMen.filter(id => !isWoman(byId.get(id)!)).length
      problems.push(
        marked < perRound
          ? `La pista de chicas necesita ${men(perRound)} en cada ronda separada y en la lista solo hay ${marked}.`
          : `La pista de chicas necesita ${men(perRound)} en cada ronda separada${roundsOf.separated > 1 ? ` (${needed} en total)` : ''}, ` +
              `pero los chicos de la lista solo pueden cubrir ${free}: el resto de esas rondas juegan sus parejas fijas masculinas.`
      )
    }
  }

  // Each check above can pass while the whole still does not fit (two pairs of one player compete for the same rounds…)
  const everyoneKnown = starters.every(hasGender)
  if (problems.length === 0 && everyoneKnown && (fixedPairs.length > 0 || womenCourtMen.length > 0)) {
    if (!scheduleFixedPairs(starters, roundModes, fixedPairs, womenCourtMen)) {
      problems.push('Las parejas fijas no encajan en las rondas elegidas: no hay forma de repartirlas sin que alguien juegue dos a la vez o sin que falte sitio en las pistas.')
    }
  }
  return problems
}
