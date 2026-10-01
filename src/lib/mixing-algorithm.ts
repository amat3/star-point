
export interface MixingParticipant {
  id: string
  rating: number
  gender: 'masculino' | 'femenino' | 'otro'
  court_position: 'reves' | 'drive' | 'ambos'
  full_name: string
  avatar_url?: string | null
  // 🆕 Reencuentros del EVENTO ANTERIOR únicamente (no incluye el actual).
  // Se usa como "mal menor" cuando hay que repetir por fuerza.
  encounter_counts: Record<string, number>
  // 🆕 Reencuentros DENTRO del evento actual (rondas ya guardadas + lo que
  // se genera en esta sesión). Repetir aquí es mucho peor que repetir solo
  // con el evento anterior.
  session_encounter_counts?: Record<string, number>
  // 🆕 Lista aparte SOLO de con quién ya ha sido PAREJA (no rival) en esa
  // misma ventana. Repetir pareja es un bloqueo duro; repetir rival es
  // solo "evitar si se puede" — por eso necesitan trackearse por separado.
  partner_history?: string[]
  is_guest?: boolean
}

export interface ExclusionRule {
  playerA: string
  playerB: string
  type: 'no_partner' | 'no_opponent' | 'no_contact'
}

export interface MixingConfig {
  genderMode: 'open' | 'mixed' | 'separated'
  // 🆕 El nivel ya no decide la agrupación — solo desempata entre opciones
  // igual de buenas en rotación. Sustituye a balanceStrategy.
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

const EXCLUSION_PENALTY = -100000

// Pesos de la función de coste. ENCOUNTER_WEIGHT domina siempre; LEVEL_WEIGHT
// solo entra en juego si config.prioritizeLevel === true, y su peso es bajo
// a propósito: es un desempate, nunca debe poder justificar un reencuentro.
const LEVEL_WEIGHT = 8
const REPAIR_ITERATIONS = 250
const RESTART_COUNT = 8

function encounterCount(a: MixingParticipant, b: MixingParticipant): number {
  return a.encounter_counts?.[b.id] ?? b.encounter_counts?.[a.id] ?? 0
}

// 🆕 Coste para la búsqueda/selección: cualquier repetición DENTRO del
// evento actual (session) pesa muchísimo más que cualquier cantidad de
// repeticiones que vengan solo del evento anterior (prior). Así, cuando
// hay que repetir por fuerza, el sistema siempre prefiere "gastar" un
// reencuentro del evento anterior antes que uno de hoy mismo.
const SESSION_REPEAT_WEIGHT = 100_000
const PRIOR_REPEAT_WEIGHT = 300

function encounterCost(a: MixingParticipant, b: MixingParticipant): number {
  const prior = a.encounter_counts?.[b.id] ?? b.encounter_counts?.[a.id] ?? 0
  const session = a.session_encounter_counts?.[b.id] ?? b.session_encounter_counts?.[a.id] ?? 0
  return session * session * SESSION_REPEAT_WEIGHT + prior * prior * PRIOR_REPEAT_WEIGHT
}

function alreadyPartnered(a: MixingParticipant, b: MixingParticipant): boolean {
  return (a.partner_history?.includes(b.id) ?? false) || (b.partner_history?.includes(a.id) ?? false)
}

function exclusionPenalty(a: string, b: string, exclusions: ExclusionRule[]): number {
  for (const ex of exclusions) {
    const match = (ex.playerA === a && ex.playerB === b) || (ex.playerA === b && ex.playerB === a)
    if (match) return EXCLUSION_PENALTY
  }
  return 0
}

function hasAnyExclusion(a: MixingParticipant, b: MixingParticipant, exclusions: ExclusionRule[]): boolean {
  return exclusionPenalty(a.id, b.id, exclusions) < 0
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

// ============================================================================
// CAPA 1 — Planificador de grupos: cascada estricta (rotación > nivel)
// ============================================================================

interface GroupsCost {
  primary: number   // exclusiones + reencuentros — SIEMPRE manda
  secondary: number // nivel — solo desempata cuando primary empata
}

function groupCost(group: MixingParticipant[], exclusions: ExclusionRule[], overallAvgRating: number): GroupsCost {
  let primary = 0
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const a = group[i]
      const b = group[j]
      if (hasAnyExclusion(a, b, exclusions)) primary += 1_000_000
      // 🆕 Restricción total: si ya fueron PAREJA (evento actual o el
      // anterior), evitar a toda costa que vuelvan a compartir pista — se
      // trata igual que una exclusión, no solo como un reencuentro más.
      // Así la Capa 2 casi nunca se encuentra sin alternativa limpia.
      if (alreadyPartnered(a, b)) primary += 1_000_000
      primary += encounterCost(a, b)
    }
  }
  const groupAvg = group.reduce((s, p) => s + p.rating, 0) / group.length
  const secondary = Math.abs(groupAvg - overallAvgRating) * LEVEL_WEIGHT
  return { primary, secondary }
}

function totalGroupsCost(groups: MixingParticipant[][], exclusions: ExclusionRule[], overallAvgRating: number): GroupsCost {
  return groups.reduce(
    (sum, g) => {
      const c = groupCost(g, exclusions, overallAvgRating)
      return { primary: sum.primary + c.primary, secondary: sum.secondary + c.secondary }
    },
    { primary: 0, secondary: 0 }
  )
}

/**
 * Compara dos costes en cascada: A es "mejor o igual" que B si tiene menor
 * rotación (primary), o si empata en rotación y tiene menor o igual nivel
 * (secondary) — nunca al revés. El nivel JAMÁS puede compensar peor rotación.
 */
function isCostBetterOrEqual(a: GroupsCost, b: GroupsCost, prioritizeLevel: boolean): boolean {
  if (a.primary < b.primary) return true
  if (a.primary > b.primary) return false
  if (!prioritizeLevel) return true
  return a.secondary <= b.secondary
}

function repairGroupsLocalSearch(
  groups: MixingParticipant[][],
  exclusions: ExclusionRule[],
  config: MixingConfig,
  iterations: number
): MixingParticipant[][] {
  if (groups.length < 2) return groups

  const allPlayers = groups.flat()
  const overallAvgRating = allPlayers.reduce((s, p) => s + p.rating, 0) / allPlayers.length

  let current = groups.map(g => [...g])
  let currentCost = totalGroupsCost(current, exclusions, overallAvgRating)

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

    const candidateCost = totalGroupsCost(candidate, exclusions, overallAvgRating)
    if (isCostBetterOrEqual(candidateCost, currentCost, config.prioritizeLevel)) {
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
  const shuffled = [...pool].sort(() => Math.random() - 0.5)

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
  let best = buildAndRepairOneAttempt(pool, config, exclusions)
  let bestCost = totalGroupsCost(
    best.groups,
    exclusions,
    best.groups.flat().reduce((s, p) => s + p.rating, 0) / (best.groups.flat().length || 1)
  )

  for (let attempt = 1; attempt < RESTART_COUNT; attempt++) {
    const candidate = buildAndRepairOneAttempt(pool, config, exclusions)
    const overallAvg = candidate.groups.flat().reduce((s, p) => s + p.rating, 0) / (candidate.groups.flat().length || 1)
    const candidateCost = totalGroupsCost(candidate.groups, exclusions, overallAvg)
    const strictlyBetter = candidateCost.primary < bestCost.primary ||
      (config.prioritizeLevel && candidateCost.primary === bestCost.primary && candidateCost.secondary < bestCost.secondary)
    if (strictlyBetter) {
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
  const [p1, p2, p3, p4] = group

  const permutations: [MixingParticipant, MixingParticipant][][] = [
    [[p1, p2], [p3, p4]],
    [[p1, p3], [p2, p4]],
    [[p1, p4], [p2, p3]],
  ]

  const hasExclusionInPerm = ([pairA, pairB]: [MixingParticipant, MixingParticipant][]): boolean => {
    const [a1, a2] = pairA
    const [b1, b2] = pairB
    const all: [MixingParticipant, MixingParticipant][] = [[a1, a2], [b1, b2], [a1, b1], [a1, b2], [a2, b1], [a2, b2]]
    return all.some(([x, y]) => hasAnyExclusion(x, y, exclusions))
  }
  const hasPartnerRepeatInPerm = ([pairA, pairB]: [MixingParticipant, MixingParticipant][]): boolean =>
    alreadyPartnered(pairA[0], pairA[1]) || alreadyPartnered(pairB[0], pairB[1])
  const rotationCost = ([pairA, pairB]: [MixingParticipant, MixingParticipant][]): number => {
    const [a1, a2] = pairA
    const [b1, b2] = pairB
    const all: [MixingParticipant, MixingParticipant][] = [[a1, a2], [b1, b2], [a1, b1], [a1, b2], [a2, b1], [a2, b2]]
    return all.reduce((s, [x, y]) => s + encounterCost(x, y), 0)
  }
  const levelDiff = ([pairA, pairB]: [MixingParticipant, MixingParticipant][]): number =>
    Math.abs((pairA[0].rating + pairA[1].rating) - (pairB[0].rating + pairB[1].rating))
  const positionScore = ([pairA, pairB]: [MixingParticipant, MixingParticipant][]): number =>
    getPositionScore(pairA[0], pairA[1]) + getPositionScore(pairB[0], pairB[1])

  // 🎯 CASCADA: cada nivel filtra sobre lo que sobrevivió del anterior.

  // Nivel 1: exclusiones (filtro duro)
  const noExclusion = permutations.filter(p => !hasExclusionInPerm(p))
  const afterExclusion = noExclusion.length > 0 ? noExclusion : permutations
  const exclusionForced = noExclusion.length === 0

  // Nivel 2: pareja repetida (filtro duro)
  const noPartnerRepeat = afterExclusion.filter(p => !hasPartnerRepeatInPerm(p))
  const afterPartner = noPartnerRepeat.length > 0 ? noPartnerRepeat : afterExclusion
  const partnerRepeatForced = noPartnerRepeat.length === 0

  // Nivel 3: rotación (evento actual pesa mucho más que el anterior)
  const costs = afterPartner.map(rotationCost)
  const minCost = Math.min(...costs)
  let candidates = afterPartner.filter((_, i) => costs[i] === minCost)

  // Nivel 4: nivel de juego (desempate opcional)
  if (config.prioritizeLevel && candidates.length > 1) {
    const diffs = candidates.map(levelDiff)
    const minDiff = Math.min(...diffs)
    candidates = candidates.filter((_, i) => diffs[i] === minDiff)
  }

  // Nivel 5: posición en pista (desempate opcional, último)
  if (config.forcePosition && candidates.length > 1) {
    const posScores = candidates.map(positionScore)
    const maxPos = Math.max(...posScores)
    candidates = candidates.filter((_, i) => posScores[i] === maxPos)
  }

  const [pairA, pairB] = candidates[0]

  const REPEAT_WARNING_THRESHOLD = 2
  const allFinalPairs: [MixingParticipant, MixingParticipant][] = [pairA, pairB, [pairA[0], pairB[0]], [pairA[0], pairB[1]], [pairA[1], pairB[0]], [pairA[1], pairB[1]]]
  const hasRivalRepeatIssue = allFinalPairs.some(([x, y]) => encounterCount(x, y) >= REPEAT_WARNING_THRESHOLD)

  const warningMsgs: string[] = []
  if (exclusionForced) warningMsgs.push('No fue posible respetar todas las exclusiones en esta pista')
  if (partnerRepeatForced) warningMsgs.push('No fue posible evitar que estos jugadores repitan como PAREJA — no había ninguna alternativa disponible')
  else if (hasRivalRepeatIssue) warningMsgs.push('Estos jugadores ya han coincidido varias veces recientemente — no fue posible evitarlo esta vez')

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
 * grupo, y registra en partner_history quién ha sido PAREJA de quién esta
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
    if (!p.partner_history) p.partner_history = []
    if (!p.partner_history.includes(partnerId)) p.partner_history.push(partnerId)
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
  }))

  const rounds: RoundProposal[] = []
  for (let i = 0; i < roundsCount; i++) {
    const round = generateMixingRound(working, config)
    rounds.push(round)
    applyRoundToHistory(working, round.matches)
  }
  return rounds
}