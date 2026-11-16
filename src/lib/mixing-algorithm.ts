
export interface MixingParticipant {
  id: string
  rating: number
  gender: 'masculino' | 'femenino' | 'otro'
  court_position: 'reves' | 'drive' | 'ambos'
  full_name: string
  avatar_url?: string | null
  // Reencuentros del EVENTO ANTERIOR únicamente (no incluye el actual).
  // Coste blando: se tolera antes que desequilibrar el nivel.
  encounter_counts: Record<string, number>
  // Reencuentros DENTRO del evento actual (rondas ya guardadas + lo que se
  // genera en esta sesión). Repetir aquí es el peor caso.
  session_encounter_counts?: Record<string, number>
  // Con quién fue PAREJA en el evento ANTERIOR. Coste blando.
  partner_history?: string[]
  // Con quién ya ha sido PAREJA en el evento ACTUAL. Bloqueo duro.
  session_partner_history?: string[]
  is_guest?: boolean
}

export interface ExclusionRule {
  playerA: string
  playerB: string
  type: 'no_partner' | 'no_opponent' | 'no_contact'
}

// Gender format of a round:
//  - open: anyone with anyone (the usual draw)
//  - mixed: as many courts as possible with 2 women and 2 men, played in mixed pairs
//  - separated: women with women and men with men; the women left over when they are not a multiple of 4
//    share their court with men (as few as possible)
export type GenderMode = 'open' | 'mixed' | 'separated'

// Two players who must be partners once in the event, in a round whose format matches their genders: a woman and
// a man in a mixed round, two women or two men in a separated round (see scheduleFixedPairs)
export type FixedPair = [string, string]

export interface MixingConfig {
  genderMode: GenderMode
  // Format of each round in generateEventRounds (index 0 = round 1); a round without an entry uses genderMode
  roundGenderModes?: GenderMode[]
  // Event rules (generateEventRounds): pairs that must play together once, and the men who may complete the
  // women's court of a separated round (empty or missing: any man)
  fixedPairs?: FixedPair[]
  womenCourtMen?: string[]
  // Pairs that must be partners in THIS round (generateMixingRound); generateEventRounds fills it from the schedule
  lockedPairs?: FixedPair[]
  // Igualar el nivel: equilibra las dos parejas de cada pista y el nivel medio
  // entre pistas. Pesa más que evitar coincidencias con el evento anterior,
  // pero nunca que repetir pareja o pista dentro del mismo evento.
  prioritizeLevel: boolean
  forcePosition: boolean
  exclusions?: ExclusionRule[]
}

// Rotation always comes first; level and position only break ties, so there is never a reason to
// switch them off. Used by the admin generator and by the automatic draw.
export const DEFAULT_MIXING_CONFIG: MixingConfig = { genderMode: 'open', prioritizeLevel: true, forcePosition: true }

export interface MatchProposal {
  courtNumber: number
  player1: MixingParticipant
  player2: MixingParticipant
  player3: MixingParticipant
  player4: MixingParticipant
  pairA: [MixingParticipant, MixingParticipant]
  pairB: [MixingParticipant, MixingParticipant]
  warning?: string
}

export interface RoundProposal {
  matches: MatchProposal[]
  leftovers: MixingParticipant[]
}

// Jerarquía de la función de coste (de más a menos importante):
//  0. REGLAS DEL EVENTO — las parejas fijas de la ronda, juntas y de pareja; en la pista de chicas de
//              una ronda separada, solo los chicos permitidos (10.000.000 por regla rota)
//  1. DURO   — exclusiones y pareja repetida en este evento (1.000.000 por violación inevitable)
//  1b. FORMATO — en una ronda mixta o separada, una pista de 2 chicas y 2 chicos juega con parejas
//              mixtas (300.000 si no se puede). Cuántas chicas hay en cada pista no es un coste: lo fija
//              womenPerCourt al formar los grupos y los intercambios lo conservan.
//  2. FUERTE — volver a coincidir en pista dentro de este evento (100.000 × veces²)
//  3. BLANDO — nivel (parejas igualadas e igual nivel medio entre pistas), y a menor
//              peso, coincidir o ser pareja como en el evento anterior
//  4. DESEMPATE — posición en pista (drive/revés)
const RULE_PENALTY = 10_000_000
const HARD_PENALTY = 1_000_000
const MIXED_PAIRS_PENALTY = 300_000
const SESSION_REPEAT_WEIGHT = 100_000
const LEVEL_PAIR_WEIGHT = 100   // por punto de diferencia entre la suma de ambas parejas
const LEVEL_COURT_WEIGHT = 100  // por punto de diferencia entre el nivel medio de la pista y el global
const PRIOR_MEETING_WEIGHT = 5  // por coincidencia² con el evento anterior
const PRIOR_PARTNER_WEIGHT = 30 // por pareja repetida respecto al evento anterior
const POSITION_WEIGHT = 0.3
const REPAIR_ITERATIONS = 600
// Share of the local search moves that move a fixed pair as one (only in rounds with fixed pairs)
const PAIR_MOVE_SHARE = 0.3
const RESTART_COUNT = 12

function encounterCount(a: MixingParticipant, b: MixingParticipant): number {
  return a.encounter_counts?.[b.id] ?? b.encounter_counts?.[a.id] ?? 0
}

function sessionCount(a: MixingParticipant, b: MixingParticipant): number {
  return a.session_encounter_counts?.[b.id] ?? b.session_encounter_counts?.[a.id] ?? 0
}

function partneredBefore(history: 'partner_history' | 'session_partner_history', a: MixingParticipant, b: MixingParticipant): boolean {
  return (a[history]?.includes(b.id) ?? false) || (b[history]?.includes(a.id) ?? false)
}

type Pair = [MixingParticipant, MixingParticipant]
type Pairing = [Pair, Pair]
type Relation = 'partner' | 'rival'

// In a gendered round everyone who is not a woman counts as a man: the generator refuses those rounds
// while a starter has no gender, so 'otro' (unknown) never gets here in practice.
const isWoman = (p: MixingParticipant) => p.gender === 'femenino'

/**
 * Women on each court of a round with a gender format (the rest of each court are men), court 1 first.
 *  - separated: all-women courts while 4 are left; the 1–3 left over share the next court with men;
 *    the remaining courts are men's. 11 women in 6 courts → [4, 4, 3, 0, 0, 0].
 *  - mixed: 2 women and 2 men per court while both last; then the larger group fills the rest, so at most
 *    one court has 1 + 3. 11 women in 6 courts → [2, 2, 2, 2, 2, 1].
 */
export function womenPerCourt(women: number, courts: number, mode: Exclude<GenderMode, 'open'>): number[] {
  const fill = (count: number, perCourt: number) =>
    Array.from({ length: courts }, (_, i) => Math.min(Math.max(count - i * perCourt, 0), perCourt))
  if (mode === 'separated') return fill(women, 4)
  const men = courts * 4 - women
  return women <= men ? fill(women, 2) : fill(men, 2).map(menOnCourt => 4 - menOnCourt)
}

/** Both pairs are a woman and a man. */
function isMixedPairing(pairing: Pairing): boolean {
  return pairing.every(([x, y]) => isWoman(x) !== isWoman(y))
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** The format a fixed pair needs: a woman and a man play it in a mixed round, two women or two men in a separated one. */
export function fixedPairFormat(a: MixingParticipant, b: MixingParticipant): Exclude<GenderMode, 'open'> {
  return isWoman(a) !== isWoman(b) ? 'mixed' : 'separated'
}

/** Every fixed pair of the round with both players in this group plays as partners. */
function respectsLocks([pairA, pairB]: Pairing, locked: FixedPair[]): boolean {
  const partnerOf = new Map<string, string>()
  for (const [x, y] of [pairA, pairB]) {
    partnerOf.set(x.id, y.id)
    partnerOf.set(y.id, x.id)
  }
  return locked.every(([a, b]) => !partnerOf.has(a) || !partnerOf.has(b) || partnerOf.get(a) === b)
}

/**
 * Event rules a group breaks: a fixed pair of the round split between this court and another (half here, half
 * on the other court, so a split pair adds up to one), and men outside womenCourtMen on the court that a
 * separated round shares between women and men.
 */
function ruleViolations(group: MixingParticipant[], config: MixingConfig): number {
  let violations = 0
  const here = new Set(group.map(p => p.id))
  for (const [a, b] of config.lockedPairs ?? []) {
    if (here.has(a) !== here.has(b)) violations += 0.5
  }
  const allowed = config.womenCourtMen ?? []
  if (config.genderMode === 'separated' && allowed.length > 0) {
    const women = group.filter(isWoman).length
    if (women > 0 && women < group.length) {
      violations += group.filter(p => !isWoman(p) && !allowed.includes(p.id)).length
    }
  }
  return violations
}

// Una regla solo se viola según su tipo: no_contact en cualquier relación,
// no_partner solo si son pareja y no_opponent solo si son rivales.
function violatesExclusion(a: MixingParticipant, b: MixingParticipant, relation: Relation, exclusions: ExclusionRule[]): boolean {
  return exclusions.some(ex => {
    const samePair = (ex.playerA === a.id && ex.playerB === b.id) || (ex.playerA === b.id && ex.playerB === a.id)
    if (!samePair) return false
    return ex.type === 'no_contact' ||
      (ex.type === 'no_partner' && relation === 'partner') ||
      (ex.type === 'no_opponent' && relation === 'rival')
  })
}

// Las 3 formas distintas de partir un grupo de 4 en dos parejas.
function pairingsOf(group: MixingParticipant[]): Pairing[] {
  const [p1, p2, p3, p4] = group
  return [
    [[p1, p2], [p3, p4]],
    [[p1, p3], [p2, p4]],
    [[p1, p4], [p2, p3]],
  ]
}

function rivalPairs([pairA, pairB]: Pairing): Pair[] {
  return [[pairA[0], pairB[0]], [pairA[0], pairB[1]], [pairA[1], pairB[0]], [pairA[1], pairB[1]]]
}

function exclusionViolations(pairing: Pairing, exclusions: ExclusionRule[]): number {
  const [pairA, pairB] = pairing
  let n = 0
  for (const [x, y] of [pairA, pairB]) if (violatesExclusion(x, y, 'partner', exclusions)) n++
  for (const [x, y] of rivalPairs(pairing)) if (violatesExclusion(x, y, 'rival', exclusions)) n++
  return n
}

function sessionPartnerRepeats([pairA, pairB]: Pairing): number {
  return Number(partneredBefore('session_partner_history', pairA[0], pairA[1])) +
    Number(partneredBefore('session_partner_history', pairB[0], pairB[1]))
}

function priorPartnerRepeats([pairA, pairB]: Pairing): number {
  return Number(partneredBefore('partner_history', pairA[0], pairA[1])) +
    Number(partneredBefore('partner_history', pairB[0], pairB[1]))
}

function getPositionScore(a: MixingParticipant, b: MixingParticipant): number {
  const posA = a.court_position
  const posB = b.court_position
  if (posA === 'drive' && posB === 'reves') return 20
  if (posA === 'reves' && posB === 'drive') return 20
  if (posA === 'ambos' || posB === 'ambos') return 15
  if (posA === posB) return -50
  return 0
}

/** Coste blando de una forma concreta de emparejar un grupo (menor = mejor). */
function pairingCost([pairA, pairB]: Pairing, config: MixingConfig): number {
  let cost = priorPartnerRepeats([pairA, pairB]) * PRIOR_PARTNER_WEIGHT
  if (config.prioritizeLevel) {
    const diff = Math.abs((pairA[0].rating + pairA[1].rating) - (pairB[0].rating + pairB[1].rating))
    cost += diff * LEVEL_PAIR_WEIGHT
  }
  if (config.forcePosition) {
    cost -= (getPositionScore(pairA[0], pairA[1]) + getPositionScore(pairB[0], pairB[1])) * POSITION_WEIGHT
  }
  return cost
}

/**
 * Formas de emparejar el grupo que sobreviven a los filtros duros, en cascada:
 * exclusiones primero, pareja repetida del evento actual después y, en una ronda
 * mixta o separada, parejas mixtas si en la pista hay 2 chicas y 2 chicos. Si nada
 * sobrevive a un filtro se mantiene el conjunto anterior (y se avisa).
 */
function viablePairings(group: MixingParticipant[], exclusions: ExclusionRule[], config: MixingConfig) {
  // Fixed pairs of this round play together whatever else happens
  const all = lockedPairings(group, config)
  const noExclusion = all.filter(p => exclusionViolations(p, exclusions) === 0)
  const afterExclusion = noExclusion.length > 0 ? noExclusion : all
  const noPartnerRepeat = afterExclusion.filter(p => sessionPartnerRepeats(p) === 0)
  const afterPartner = noPartnerRepeat.length > 0 ? noPartnerRepeat : afterExclusion
  // Never the two women against the two men
  const wantsMixedPairs = config.genderMode !== 'open' && group.filter(isWoman).length === 2
  const mixedPairs = wantsMixedPairs ? afterPartner.filter(isMixedPairing) : afterPartner
  return {
    pairings: mixedPairs.length > 0 ? mixedPairs : afterPartner,
    exclusionForced: noExclusion.length === 0,
    partnerRepeatForced: noPartnerRepeat.length === 0,
    mixedPairsForced: mixedPairs.length === 0,
  }
}

/** The ways to pair the group that keep this round's fixed pairs together (all three when none is here). */
function lockedPairings(group: MixingParticipant[], config: MixingConfig): Pairing[] {
  const all = pairingsOf(group)
  const locked = config.lockedPairs ?? []
  if (locked.length === 0) return all
  const kept = all.filter(p => respectsLocks(p, locked))
  return kept.length > 0 ? kept : all
}

// ============================================================================
// CAPA 1 — Planificador de grupos: cascada estricta (rotación > nivel)
// ============================================================================

interface GroupsCost {
  primary: number   // duro + repetición dentro del evento — SIEMPRE manda
  secondary: number // nivel + historial del evento anterior (blando)
}

function groupCost(
  group: MixingParticipant[],
  exclusions: ExclusionRule[],
  overallAvgRating: number,
  config: MixingConfig
): GroupsCost {
  let primary = RULE_PENALTY * ruleViolations(group, config)
  let secondary = 0

  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const session = sessionCount(group[i], group[j])
      const prior = encounterCount(group[i], group[j])
      primary += session * session * SESSION_REPEAT_WEIGHT
      secondary += prior * prior * PRIOR_MEETING_WEIGHT
    }
  }

  if (group.length === 4) {
    // Se puntúa con la misma regla que luego usará la capa 2, así que el
    // planificador sabe qué emparejamiento tendrá cada grupo. Las violaciones
    // duras solo cuentan si NINGUNA forma de emparejar el grupo las evita.
    const all = lockedPairings(group, config)
    primary += HARD_PENALTY * Math.min(...all.map(p => exclusionViolations(p, exclusions) + sessionPartnerRepeats(p)))
    const { pairings, mixedPairsForced } = viablePairings(group, exclusions, config)
    if (mixedPairsForced) primary += MIXED_PAIRS_PENALTY
    secondary += Math.min(...pairings.map(p => pairingCost(p, config)))
  }

  if (config.prioritizeLevel) {
    const groupAvg = group.reduce((sum, p) => sum + p.rating, 0) / group.length
    secondary += Math.abs(groupAvg - overallAvgRating) * LEVEL_COURT_WEIGHT
  }

  return { primary, secondary }
}

function totalGroupsCost(
  groups: MixingParticipant[][],
  exclusions: ExclusionRule[],
  overallAvgRating: number,
  config: MixingConfig
): GroupsCost {
  return groups.reduce(
    (sum, g) => {
      const c = groupCost(g, exclusions, overallAvgRating, config)
      return { primary: sum.primary + c.primary, secondary: sum.secondary + c.secondary }
    },
    { primary: 0, secondary: 0 }
  )
}

/** A es mejor o igual que B: menos violaciones/repeticiones del evento, y a igualdad, menor coste blando. */
function isCostBetterOrEqual(a: GroupsCost, b: GroupsCost): boolean {
  if (a.primary !== b.primary) return a.primary < b.primary
  return a.secondary <= b.secondary
}

function averageRating(players: MixingParticipant[]): number {
  return players.reduce((sum, p) => sum + p.rating, 0) / (players.length || 1)
}

function repairGroupsLocalSearch(
  groups: MixingParticipant[][],
  exclusions: ExclusionRule[],
  config: MixingConfig,
  iterations: number
): MixingParticipant[][] {
  if (groups.length < 2) return groups

  const overallAvgRating = averageRating(groups.flat())

  let current = groups.map(g => [...g])
  let currentCost = totalGroupsCost(current, exclusions, overallAvgRating, config)

  const inRound = new Set(current.flat().map(p => p.id))
  const locked = (config.lockedPairs ?? []).filter(([a, b]) => inRound.has(a) && inRound.has(b))

  for (let iter = 0; iter < iterations; iter++) {
    const candidate = locked.length > 0 && Math.random() < PAIR_MOVE_SHARE
      ? moveFixedPair(current, locked)
      : swapTwoPlayers(current, config)
    if (!candidate) continue

    const candidateCost = totalGroupsCost(candidate, exclusions, overallAvgRating, config)
    if (isCostBetterOrEqual(candidateCost, currentCost)) {
      current = candidate
      currentCost = candidateCost
    }
  }

  return current
}

/** One local search move: two players of different courts swap places (of the same gender in a gendered round). */
function swapTwoPlayers(current: MixingParticipant[][], config: MixingConfig): MixingParticipant[][] | null {
  const gi = Math.floor(Math.random() * current.length)
  let gj: number
  let pi: number
  let pj: number
  if (config.genderMode === 'open') {
    gj = Math.floor(Math.random() * current.length)
    if (gj === gi) gj = (gj + 1) % current.length
    pi = Math.floor(Math.random() * current[gi].length)
    pj = Math.floor(Math.random() * current[gj].length)
  } else {
    // Each court keeps its number of women: a player only swaps with one of the same gender
    pi = Math.floor(Math.random() * current[gi].length)
    const woman = isWoman(current[gi][pi])
    const options = current.flatMap((g, gIdx) =>
      gIdx === gi ? [] : g.flatMap((p, pIdx) => (isWoman(p) === woman ? [[gIdx, pIdx] as const] : []))
    )
    if (options.length === 0) return null
    ;[gj, pj] = options[Math.floor(Math.random() * options.length)]
  }

  const candidate = current.map(g => [...g])
  const tmp = candidate[gi][pi]
  candidate[gi][pi] = candidate[gj][pj]
  candidate[gj][pj] = tmp
  return candidate
}

/**
 * The other local search move: a fixed pair changes court as one, swapping places with two players of the same
 * genders. Single swaps cannot do it (the first half of the move would split the pair and be rejected).
 */
function moveFixedPair(current: MixingParticipant[][], locked: FixedPair[]): MixingParticipant[][] | null {
  const [a, b] = locked[Math.floor(Math.random() * locked.length)]
  const gi = current.findIndex(g => g.some(p => p.id === a))
  const ia = current[gi].findIndex(p => p.id === a)
  const ib = current[gi].findIndex(p => p.id === b)
  // Split: single swaps join it first
  if (ib < 0) return null

  let gj = Math.floor(Math.random() * current.length)
  if (gj === gi) gj = (gj + 1) % current.length
  const options: [number, number][] = []
  current[gj].forEach((x, ja) => current[gj].forEach((y, jb) => {
    if (ja !== jb && isWoman(x) === isWoman(current[gi][ia]) && isWoman(y) === isWoman(current[gi][ib])) options.push([ja, jb])
  }))
  if (options.length === 0) return null
  const [ja, jb] = options[Math.floor(Math.random() * options.length)]

  const candidate = current.map(g => [...g])
  ;[candidate[gi][ia], candidate[gj][ja]] = [candidate[gj][ja], candidate[gi][ia]]
  ;[candidate[gi][ib], candidate[gj][jb]] = [candidate[gj][jb], candidate[gi][ib]]
  return candidate
}

/**
 * First draft of a gendered round: how many women each court has comes from the format, this round's fixed pairs
 * start together on a court with room for both (two men only on a men's court), the court shared by women and
 * men starts with the allowed men, and everyone else goes anywhere at random. The local search then improves it
 * without breaking any of that.
 */
function seedGenderedGroups(usable: MixingParticipant[], courtCount: number, config: MixingConfig): MixingParticipant[][] {
  const mode = config.genderMode === 'open' ? 'mixed' : config.genderMode
  const composition = womenPerCourt(usable.filter(isWoman).length, courtCount, mode)
  const room = composition.map(women => ({ women, men: 4 - women }))
  const groups: MixingParticipant[][] = composition.map(() => [])
  const placed = new Set<string>()
  const byId = new Map(usable.map(p => [p.id, p]))
  const take = (court: number, player: MixingParticipant) => {
    groups[court].push(player)
    placed.add(player.id)
    if (isWoman(player)) room[court].women--
    else room[court].men--
  }

  for (const [a, b] of shuffled(config.lockedPairs ?? [])) {
    const pa = byId.get(a)
    const pb = byId.get(b)
    if (!pa || !pb) continue
    const women = Number(isWoman(pa)) + Number(isWoman(pb))
    const courts = room.flatMap((r, c) =>
      r.women >= women && r.men >= 2 - women && (women > 0 || composition[c] === 0) ? [c] : []
    )
    if (courts.length === 0) continue
    const court = courts[Math.floor(Math.random() * courts.length)]
    take(court, pa)
    take(court, pb)
  }

  const shared = (c: number) => composition[c] > 0 && composition[c] < 4
  const allowed = new Set(config.womenCourtMen ?? [])
  const looseWomen = shuffled(usable.filter(p => isWoman(p) && !placed.has(p.id)))
  const looseMen = shuffled(usable.filter(p => !isWoman(p) && !placed.has(p.id)))
  if (mode === 'separated' && allowed.size > 0) {
    looseMen.sort((x, y) => Number(allowed.has(y.id)) - Number(allowed.has(x.id)))
  }
  const order = composition.map((_, c) => c).sort((x, y) => Number(shared(y)) - Number(shared(x)))
  for (const court of order) {
    while (room[court].women > 0 && looseWomen.length > 0) take(court, looseWomen.shift()!)
    while (room[court].men > 0 && looseMen.length > 0) take(court, looseMen.shift()!)
  }
  return groups
}

function buildAndRepairOneAttempt(
  pool: MixingParticipant[],
  config: MixingConfig,
  exclusions: ExclusionRule[]
): { groups: MixingParticipant[][], leftovers: MixingParticipant[] } {
  const order = shuffled(pool)

  const courtCount = Math.floor(order.length / 4)
  const usableCount = courtCount * 4
  const leftovers = order.slice(usableCount)
  const usable = order.slice(0, usableCount)

  let groups: MixingParticipant[][] = []
  if (config.genderMode === 'open') {
    for (let i = 0; i < courtCount; i++) {
      groups.push(usable.slice(i * 4, i * 4 + 4))
    }
  } else {
    groups = seedGenderedGroups(usable, courtCount, config)
  }

  if (groups.length > 1) {
    groups = repairGroupsLocalSearch(groups, exclusions, config, REPAIR_ITERATIONS)
  }

  return { groups, leftovers }
}

function planGroupsForRound(
  pool: MixingParticipant[],
  config: MixingConfig,
  exclusions: ExclusionRule[]
): { groups: MixingParticipant[][], leftovers: MixingParticipant[] } {
  const costOf = (attempt: { groups: MixingParticipant[][] }) =>
    totalGroupsCost(attempt.groups, exclusions, averageRating(attempt.groups.flat()), config)

  let best = buildAndRepairOneAttempt(pool, config, exclusions)
  let bestCost = costOf(best)

  for (let attempt = 1; attempt < RESTART_COUNT; attempt++) {
    const candidate = buildAndRepairOneAttempt(pool, config, exclusions)
    const candidateCost = costOf(candidate)
    if (candidateCost.primary < bestCost.primary ||
        (candidateCost.primary === bestCost.primary && candidateCost.secondary < bestCost.secondary)) {
      best = candidate
      bestCost = candidateCost
    }
  }

  return best
}

// ============================================================================
// CAPA 2 — Asignación de roles dentro de un grupo ya formado
// ============================================================================

function resolveCourtRoles(
  group: MixingParticipant[],
  courtNumber: number,
  config: MixingConfig,
  exclusions: ExclusionRule[]
): MatchProposal {
  const { pairings, exclusionForced, partnerRepeatForced, mixedPairsForced } = viablePairings(group, exclusions, config)

  // Entre las formas viables, la de menor coste blando (nivel, historial, posición).
  const costs = pairings.map(p => pairingCost(p, config))
  const [pairA, pairB] = pairings[costs.indexOf(Math.min(...costs))]

  // Avisos: solo reencuentros DENTRO del evento. Coincidir con el evento
  // anterior es una preferencia blanda y no se avisa.
  // Having been partners before and now being rivals (or the reverse) is fine:
  // only repeating the SAME relation counts. Rival meetings so far = total
  // meetings minus the one as partners.
  const sessionRivalCount = (x: MixingParticipant, y: MixingParticipant) =>
    sessionCount(x, y) - (partneredBefore('session_partner_history', x, y) ? 1 : 0)
  const hasSessionRepeat = rivalPairs([pairA, pairB]).some(([x, y]) => sessionRivalCount(x, y) >= 1)

  const warningMsgs: string[] = []
  const here = new Set(group.map(p => p.id))
  if ((config.lockedPairs ?? []).some(([a, b]) => here.has(a) !== here.has(b))) warningMsgs.push('Una pareja fija ha quedado separada')
  if (ruleViolations(group, { ...config, lockedPairs: [] }) > 0) warningMsgs.push('Juega en la pista de chicas un chico que no está en la lista')
  if (exclusionForced) warningMsgs.push('No fue posible respetar todas las exclusiones en esta pista')
  if (partnerRepeatForced) warningMsgs.push('No fue posible evitar que estos jugadores repitan como PAREJA — no había ninguna alternativa disponible')
  if (mixedPairsForced) warningMsgs.push('No fue posible formar parejas mixtas en esta pista')
  if (hasSessionRepeat) warningMsgs.push('Algunos jugadores vuelven a enfrentarse en este evento — no fue posible evitarlo')

  return {
    courtNumber,
    player1: pairA[0],
    player2: pairA[1],
    player3: pairB[0],
    player4: pairB[1],
    pairA,
    pairB,
    ...(warningMsgs.length > 0 ? { warning: warningMsgs.join(' ') } : {})
  }
}

// ============================================================================
// Puntos de entrada públicos
// ============================================================================

export function generateMixingRound(
  participants: MixingParticipant[],
  config: MixingConfig
): RoundProposal {
  const exclusions = config.exclusions ?? []
  const { groups, leftovers } = planGroupsForRound(participants, config, exclusions)
  const matches = groups.map((group, i) => resolveCourtRoles(group, i + 1, config, exclusions))
  return { matches, leftovers }
}

/**
 * Actualiza el historial en memoria tras una ronda: suma +1 al contador de
 * la SESIÓN ACTUAL (session_encounter_counts) para las 6 relaciones del
 * grupo, y registra en session_partner_history quién ha sido PAREJA de quién esta
 * vez (eso es lo que activa el bloqueo duro en la siguiente ronda). El
 * contador del evento anterior (encounter_counts) no se toca aquí — se
 * carga una sola vez al inicio desde el servidor.
 */
export function applyRoundToHistory(participants: MixingParticipant[], matches: MatchProposal[]): void {
  const bump = (pid: string, otherId: string) => {
    const p = participants.find(cp => cp.id === pid)
    if (!p) return
    if (!p.session_encounter_counts) p.session_encounter_counts = {}
    p.session_encounter_counts[otherId] = (p.session_encounter_counts[otherId] || 0) + 1
  }
  const markPartner = (pid: string, partnerId: string) => {
    const p = participants.find(cp => cp.id === pid)
    if (!p) return
    if (!p.session_partner_history) p.session_partner_history = []
    if (!p.session_partner_history.includes(partnerId)) p.session_partner_history.push(partnerId)
  }

  matches.forEach(m => {
    const all = [m.player1, m.player2, m.player3, m.player4]
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        bump(all[i].id, all[j].id)
        bump(all[j].id, all[i].id)
      }
    }
    markPartner(m.pairA[0].id, m.pairA[1].id)
    markPartner(m.pairA[1].id, m.pairA[0].id)
    markPartner(m.pairB[0].id, m.pairB[1].id)
    markPartner(m.pairB[1].id, m.pairB[0].id)
  })
}

// Capacity of a round for fixed pairs, from how many women each court has
interface RoundRoom {
  mixedPairs: number     // woman + man (mixed rounds)
  womenPairs: number     // two women (separated rounds)
  menPairs: number       // two men, on a men's court only (separated rounds)
  womenCourtMen: number  // men needed on the court a separated round shares between women and men
}

function roundRoom(mode: GenderMode, women: number, courts: number): RoundRoom {
  if (mode === 'open') return { mixedPairs: 0, womenPairs: 0, menPairs: 0, womenCourtMen: 0 }
  const composition = womenPerCourt(women, courts, mode)
  const separated = mode === 'separated'
  return {
    mixedPairs: separated ? 0 : composition.reduce((sum, w) => sum + Math.min(w, 4 - w), 0),
    womenPairs: separated ? composition.reduce((sum, w) => sum + Math.floor(w / 2), 0) : 0,
    menPairs: separated ? composition.filter(w => w === 0).length * 2 : 0,
    womenCourtMen: separated ? composition.reduce((sum, w) => sum + (w > 0 && w < 4 ? 4 - w : 0), 0) : 0,
  }
}

/**
 * Men's places needed on the women's court over all the separated rounds, and how many of them the allowed men
 * can fill: each allowed man is free in every separated round except those where he plays a men's fixed pair.
 */
export function womenCourtSlots(
  players: MixingParticipant[],
  roundModes: GenderMode[],
  fixedPairs: FixedPair[],
  womenCourtMen: string[]
): { needed: number; free: number; perRound: number } {
  const women = players.filter(isWoman).length
  const courts = Math.floor(players.length / 4)
  const separatedRounds = roundModes.filter(mode => mode === 'separated').length
  const perRound = roundRoom('separated', women, courts).womenCourtMen
  const byId = new Map(players.map(p => [p.id, p]))
  const allowed = womenCourtMen.filter(id => byId.has(id) && !isWoman(byId.get(id)!))
  const menPairsOf = (id: string) => fixedPairs.filter(pair => {
    const [a, b] = pair.map(x => byId.get(x))
    return pair.includes(id) && !!a && !!b && !isWoman(a) && !isWoman(b)
  }).length
  return {
    needed: perRound * separatedRounds,
    free: allowed.reduce((sum, id) => sum + Math.max(separatedRounds - menPairsOf(id), 0), 0),
    perRound,
  }
}

/**
 * Decides the round of each fixed pair: one round of its format, never two fixed pairs of the same player in one
 * round, room for them on that round's courts, and enough allowed men left free (not playing a men's fixed pair)
 * to complete the women's court of every separated round. Random among the valid schedules, so regenerating
 * explores others. Returns the fixed pairs of each round (index 0 = round 1), or null when no schedule fits.
 */
export function scheduleFixedPairs(
  players: MixingParticipant[],
  roundModes: GenderMode[],
  fixedPairs: FixedPair[],
  womenCourtMen: string[] = []
): FixedPair[][] | null {
  const byId = new Map(players.map(p => [p.id, p]))
  const women = players.filter(isWoman).length
  const courts = Math.floor(players.length / 4)
  const rooms = roundModes.map(mode => roundRoom(mode, women, courts))
  const allowed = new Set(womenCourtMen.filter(id => byId.has(id) && !isWoman(byId.get(id)!)))

  if (allowed.size > 0) {
    const { needed, free } = womenCourtSlots(players, roundModes, fixedPairs, womenCourtMen)
    if (free < needed) return null
  }

  type Kind = 'mixedPairs' | 'womenPairs' | 'menPairs'
  const items: { pair: FixedPair; kind: Kind; rounds: number[]; allowedMen: number }[] = []
  for (const pair of fixedPairs) {
    const a = byId.get(pair[0])
    const b = byId.get(pair[1])
    if (!a || !b) return null
    const format = fixedPairFormat(a, b)
    items.push({
      pair,
      kind: format === 'mixed' ? 'mixedPairs' : isWoman(a) ? 'womenPairs' : 'menPairs',
      rounds: roundModes.flatMap((mode, i) => (mode === format ? [i] : [])),
      allowedMen: [a, b].filter(p => allowed.has(p.id)).length,
    })
  }

  const busy = rooms.map(() => new Set<string>())
  const used = rooms.map(() => ({ mixedPairs: 0, womenPairs: 0, menPairs: 0, allowedMen: 0 }))
  const schedule: FixedPair[][] = rooms.map(() => [])
  // The most constrained first (fewest rounds to choose from); random order otherwise
  const order = shuffled(items).sort((x, y) => x.rounds.length - y.rounds.length)
  let budget = 200_000

  const fits = (item: (typeof items)[number], r: number) =>
    !busy[r].has(item.pair[0]) && !busy[r].has(item.pair[1]) &&
    used[r][item.kind] < rooms[r][item.kind] &&
    // A men's fixed pair takes its allowed men away from that round's women's court
    (allowed.size === 0 || item.allowedMen === 0 ||
      allowed.size - used[r].allowedMen - item.allowedMen >= rooms[r].womenCourtMen)

  const place = (index: number): boolean => {
    if (index === order.length) return true
    if (--budget < 0) return false
    const item = order[index]
    for (const r of shuffled(item.rounds)) {
      if (!fits(item, r)) continue
      busy[r].add(item.pair[0]).add(item.pair[1])
      used[r][item.kind]++
      used[r].allowedMen += item.allowedMen
      schedule[r].push(item.pair)
      if (place(index + 1)) return true
      busy[r].delete(item.pair[0])
      busy[r].delete(item.pair[1])
      used[r][item.kind]--
      used[r].allowedMen -= item.allowedMen
      schedule[r].pop()
    }
    return false
  }

  return place(0) ? schedule : null
}

export function generateEventRounds(
  participants: MixingParticipant[],
  config: MixingConfig,
  roundsCount: number
): RoundProposal[] {
  const working: MixingParticipant[] = participants.map(p => ({
    ...p,
    encounter_counts: { ...(p.encounter_counts ?? {}) },
    session_encounter_counts: { ...(p.session_encounter_counts ?? {}) },
    partner_history: [...(p.partner_history ?? [])],
    session_partner_history: [...(p.session_partner_history ?? [])],
  }))

  const modes = Array.from({ length: roundsCount }, (_, i) => config.roundGenderModes?.[i] ?? config.genderMode)
  const fixedPairs = config.fixedPairs ?? []
  const womenCourtMen = config.womenCourtMen ?? []
  const schedule = fixedPairs.length > 0 || womenCourtMen.length > 0
    ? scheduleFixedPairs(working, modes, fixedPairs, womenCourtMen)
    : modes.map(() => [])
  if (!schedule) throw new Error('Las parejas fijas no encajan en las rondas elegidas')

  const rounds: RoundProposal[] = []
  for (let i = 0; i < roundsCount; i++) {
    const lockedPairs = schedule[i]
    // A fixed pair plays together in its own round only: in any other they cannot be partners
    const reserved: ExclusionRule[] = fixedPairs
      .filter(pair => !lockedPairs.includes(pair))
      .map(([playerA, playerB]) => ({ playerA, playerB, type: 'no_partner' }))
    const round = generateMixingRound(working, {
      ...config,
      genderMode: modes[i],
      lockedPairs,
      exclusions: [...(config.exclusions ?? []), ...reserved],
    })
    rounds.push(round)
    applyRoundToHistory(working, round.matches)
  }
  return rounds
}
/**
 * Quick quality read of a proposal: how many times two players share a court
 * again within the event, and how many courts carry a warning.
 */
export function summarizeRounds(rounds: RoundProposal[]): { reMeetings: number; warnings: number } {
  const met = new Map<string, number>()
  let warnings = 0

  for (const round of rounds) {
    for (const m of round.matches) {
      if (m.warning) warnings++
      const ids = [m.player1.id, m.player2.id, m.player3.id, m.player4.id]
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const key = [ids[i], ids[j]].sort().join('|')
          met.set(key, (met.get(key) ?? 0) + 1)
        }
      }
    }
  }

  let reMeetings = 0
  met.forEach(count => { if (count > 1) reMeetings += count - 1 })
  return { reMeetings, warnings }
}

export interface BrokenRule {
  kind: 'pair' | 'women_court'
  // Player ids: the fixed pair, or the man on the women's court
  players: string[]
  // 1-based, for women_court
  round?: number
}

/**
 * The event rules a draw does not keep (empty when it keeps them all), checked on the result itself: fixed pairs
 * that are not partners in any round of their format, and men outside womenCourtMen on the women's court of a
 * separated round.
 */
export function brokenRules(
  rounds: RoundProposal[],
  roundModes: GenderMode[],
  fixedPairs: FixedPair[],
  womenCourtMen: string[] = []
): BrokenRule[] {
  const broken: BrokenRule[] = []
  const everyone = new Map(
    rounds.flatMap(r => r.matches.flatMap(m => [m.player1, m.player2, m.player3, m.player4])).map(p => [p.id, p])
  )
  const partners = (round: RoundProposal, a: string, b: string) =>
    round.matches.some(m => [m.pairA, m.pairB].some(([x, y]) => (x.id === a && y.id === b) || (x.id === b && y.id === a)))

  for (const [a, b] of fixedPairs) {
    const pa = everyone.get(a)
    const pb = everyone.get(b)
    const format = pa && pb ? fixedPairFormat(pa, pb) : null
    const kept = rounds.some((round, i) => roundModes[i] === format && partners(round, a, b))
    if (!kept) broken.push({ kind: 'pair', players: [a, b] })
  }

  if (womenCourtMen.length > 0) {
    rounds.forEach((round, i) => {
      if (roundModes[i] !== 'separated') return
      for (const m of round.matches) {
        const players = [m.player1, m.player2, m.player3, m.player4]
        const women = players.filter(isWoman).length
        if (women === 0 || women === 4) continue
        for (const p of players) {
          if (!isWoman(p) && !womenCourtMen.includes(p.id)) broken.push({ kind: 'women_court', players: [p.id], round: i + 1 })
        }
      }
    })
  }
  return broken
}
