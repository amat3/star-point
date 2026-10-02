
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

export interface MixingConfig {
  genderMode: 'open' | 'mixed' | 'separated'
  // Igualar el nivel: equilibra las dos parejas de cada pista y el nivel medio
  // entre pistas. Pesa más que evitar coincidencias con el evento anterior,
  // pero nunca que repetir pareja o pista dentro del mismo evento.
  prioritizeLevel: boolean
  forcePosition: boolean
  exclusions?: ExclusionRule[]
}

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
//  1. DURO   — exclusiones y pareja repetida en este evento (1.000.000 por violación inevitable)
//  2. FUERTE — volver a coincidir en pista dentro de este evento (100.000 × veces²)
//  3. BLANDO — nivel (parejas igualadas e igual nivel medio entre pistas), y a menor
//              peso, coincidir o ser pareja como en el evento anterior
//  4. DESEMPATE — posición en pista (drive/revés)
const HARD_PENALTY = 1_000_000
const SESSION_REPEAT_WEIGHT = 100_000
const LEVEL_PAIR_WEIGHT = 100   // por punto de diferencia entre la suma de ambas parejas
const LEVEL_COURT_WEIGHT = 100  // por punto de diferencia entre el nivel medio de la pista y el global
const PRIOR_MEETING_WEIGHT = 5  // por coincidencia² con el evento anterior
const PRIOR_PARTNER_WEIGHT = 30 // por pareja repetida respecto al evento anterior
const POSITION_WEIGHT = 0.3
const REPAIR_ITERATIONS = 600
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
 * exclusiones primero, pareja repetida del evento actual después. Si nada
 * sobrevive a un filtro se mantiene el conjunto anterior (y se avisa).
 */
function viablePairings(group: MixingParticipant[], exclusions: ExclusionRule[]) {
  const all = pairingsOf(group)
  const noExclusion = all.filter(p => exclusionViolations(p, exclusions) === 0)
  const afterExclusion = noExclusion.length > 0 ? noExclusion : all
  const noPartnerRepeat = afterExclusion.filter(p => sessionPartnerRepeats(p) === 0)
  const afterPartner = noPartnerRepeat.length > 0 ? noPartnerRepeat : afterExclusion
  return {
    pairings: afterPartner,
    exclusionForced: noExclusion.length === 0,
    partnerRepeatForced: noPartnerRepeat.length === 0,
  }
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
  let primary = 0
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
    const all = pairingsOf(group)
    primary += HARD_PENALTY * Math.min(...all.map(p => exclusionViolations(p, exclusions) + sessionPartnerRepeats(p)))
    const { pairings } = viablePairings(group, exclusions)
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

  for (let iter = 0; iter < iterations; iter++) {
    const gi = Math.floor(Math.random() * current.length)
    let gj = Math.floor(Math.random() * current.length)
    if (gj === gi) gj = (gj + 1) % current.length

    const pi = Math.floor(Math.random() * current[gi].length)
    const pj = Math.floor(Math.random() * current[gj].length)

    const candidate = current.map(g => [...g])
    const tmp = candidate[gi][pi]
    candidate[gi][pi] = candidate[gj][pj]
    candidate[gj][pj] = tmp

    const candidateCost = totalGroupsCost(candidate, exclusions, overallAvgRating, config)
    if (isCostBetterOrEqual(candidateCost, currentCost)) {
      current = candidate
      currentCost = candidateCost
    }
  }

  return current
}

function buildAndRepairOneAttempt(
  pool: MixingParticipant[],
  config: MixingConfig,
  exclusions: ExclusionRule[]
): { groups: MixingParticipant[][], leftovers: MixingParticipant[] } {
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  const courtCount = Math.floor(shuffled.length / 4)
  const usableCount = courtCount * 4
  const leftovers = shuffled.slice(usableCount)
  const usable = shuffled.slice(0, usableCount)

  let groups: MixingParticipant[][] = []
  for (let i = 0; i < courtCount; i++) {
    groups.push(usable.slice(i * 4, i * 4 + 4))
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
  const { pairings, exclusionForced, partnerRepeatForced } = viablePairings(group, exclusions)

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
  if (exclusionForced) warningMsgs.push('No fue posible respetar todas las exclusiones en esta pista')
  if (partnerRepeatForced) warningMsgs.push('No fue posible evitar que estos jugadores repitan como PAREJA — no había ninguna alternativa disponible')
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

  const rounds: RoundProposal[] = []
  for (let i = 0; i < roundsCount; i++) {
    const round = generateMixingRound(working, config)
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
