
export interface MixingParticipant {
  id: string
  rating: number
  gender: 'masculino' | 'femenino' | 'otro'
  court_position: 'reves' | 'drive' | 'ambos'
  full_name: string
  avatar_url?: string | null
  past_partners: string[]
  past_opponents: string[]
  opponent_counts?: Record<string, number> // nº de veces que ha sido RIVAL de cada id, SOLO en este evento (hard constraint independiente del de pareja)
  current_event_partners: string[]
  is_guest?: boolean
}

export interface ExclusionRule {
  playerA: string
  playerB: string
  type: 'no_partner' | 'no_opponent' | 'no_contact'
}

export interface MixingConfig {
  genderMode: 'open' | 'mixed' | 'separated'
  balanceStrategy: 'similar_levels' | 'pro_am'
  avoidRepetition: boolean
  forcePosition: boolean
  exclusions?: ExclusionRule[]
}

export interface MatchProposal {
  courtNumber: number
  player1: MixingParticipant
  player2: MixingParticipant
  player3: MixingParticipant
  player4: MixingParticipant
  // Derived info associated with the pair
  pairA: [MixingParticipant, MixingParticipant]
  pairB: [MixingParticipant, MixingParticipant]
  warning?: string
}

export interface RoundProposal {
  matches: MatchProposal[]
  leftovers: MixingParticipant[]
}

const EXCLUSION_PENALTY = -100000

// 🎯 Dentro de un mismo evento, dos jugadores pueden ser RIVALES como
// máximo esta cantidad de veces. Es un cupo INDEPENDIENTE del de pareja
// (pareja nunca se repite, ver classifyPartnerIssue).
const MAX_TIMES_AS_OPPONENT = 1

// 🆕 Pesos de la Capa 1 (planificador de grupos). No son "cupos duros" como
// los de arriba — son costes que la búsqueda local intenta minimizar.
const REPEAT_WEIGHT = 300      // coste por cada vez que 2 jugadores YA compartieron pista este evento (se eleva al cuadrado, así 2 veces cuesta 4x, no 2x)
const BALANCE_WEIGHT = 12      // coste por desviación de nivel de un grupo respecto a la media del evento
const NO_CONTACT_COST = 1_000_000 // coste "prohibitivo": nunca deben compartir grupo si hay no_contact
const REPAIR_ITERATIONS = 250  // nº de intentos de swap que prueba la búsqueda local por ronda

function exclusionPenalty(
  a: string, b: string,
  asPartners: boolean,
  exclusions: ExclusionRule[]
): number {
  for (const ex of exclusions) {
    const match = (ex.playerA === a && ex.playerB === b) || (ex.playerA === b && ex.playerB === a)
    if (!match) continue
    if (ex.type === 'no_contact') return EXCLUSION_PENALTY
    if (ex.type === 'no_partner' && asPartners) return EXCLUSION_PENALTY
    if (ex.type === 'no_opponent' && !asPartners) return EXCLUSION_PENALTY
  }
  return 0
}

function hasNoContactExclusion(a: MixingParticipant, b: MixingParticipant, exclusions: ExclusionRule[]): boolean {
  return exclusions.some(ex =>
    ((ex.playerA === a.id && ex.playerB === b.id) || (ex.playerA === b.id && ex.playerB === a.id)) &&
    ex.type === 'no_contact'
  )
}

function checkExclusionViolation(
  pairA: [MixingParticipant, MixingParticipant],
  pairB: [MixingParticipant, MixingParticipant],
  exclusions: ExclusionRule[]
): boolean {
  const [a1, a2] = pairA
  const [b1, b2] = pairB
  const check = (x: string, y: string, asPartners: boolean) =>
    exclusionPenalty(x, y, asPartners, exclusions) < 0
  return (
    check(a1.id, a2.id, true) || check(b1.id, b2.id, true) ||
    check(a1.id, b1.id, false) || check(a1.id, b2.id, false) ||
    check(a2.id, b1.id, false) || check(a2.id, b2.id, false)
  )
}

type PartnerIssueReason = 'exclusion' | 'repetition'

/**
 * Cuántas veces han compartido YA un mismo grupo de 4 (como pareja O como
 * rivales, da igual el rol) dentro de este evento. Es la métrica que usa la
 * Capa 1 (planificador de grupos) para decidir a quién rotar de pista.
 */
function sharedGroupsThisEvent(a: MixingParticipant, b: MixingParticipant): number {
  const wasPartner = (a.current_event_partners.includes(b.id) || b.current_event_partners.includes(a.id)) ? 1 : 0
  const opponentTimes = a.opponent_counts?.[b.id] ?? b.opponent_counts?.[a.id] ?? 0
  return wasPartner + opponentTimes
}

/**
 * Clasifica si dos jugadores NO pueden ser pareja: por exclusión manual
 * (no_partner/no_contact) o por haber sido ya pareja en ESTE evento (hard
 * constraint — repetir pareja entre eventos distintos sigue permitido y se
 * gestiona aparte como preferencia soft vía past_partners). Este cupo es
 * INDEPENDIENTE del de rival (ver classifyOpponentIssue).
 */
function classifyPartnerIssue(
  a: MixingParticipant,
  b: MixingParticipant,
  exclusions: ExclusionRule[]
): PartnerIssueReason | null {
  if (exclusionPenalty(a.id, b.id, true, exclusions) < 0) return 'exclusion'
  if (a.current_event_partners.includes(b.id) || b.current_event_partners.includes(a.id)) return 'repetition'
  return null
}

/**
 * Clasifica si dos jugadores NO pueden volver a ser rivales: por exclusión
 * manual (no_opponent/no_contact) o por haber alcanzado ya MAX_TIMES_AS_OPPONENT
 * veces como rivales DENTRO DE ESTE EVENTO. Cupo INDEPENDIENTE del de pareja.
 */
function classifyOpponentIssue(
  a: MixingParticipant,
  b: MixingParticipant,
  exclusions: ExclusionRule[]
): PartnerIssueReason | null {
  if (exclusionPenalty(a.id, b.id, false, exclusions) < 0) return 'exclusion'
  const count = a.opponent_counts?.[b.id] ?? 0
  if (count >= MAX_TIMES_AS_OPPONENT) return 'repetition'
  return null
}

// ============================================================================
// 🆕 CAPA 1 — Planificador de grupos (quién comparte pista con quién)
// ============================================================================

/**
 * Coste de un grupo de 4: penaliza fuerte cada reencuentro ya ocurrido este
 * evento (al cuadrado, para que 2 reencuentros duelan mucho más que 1) y,
 * para 'similar_levels', penaliza que el nivel medio del grupo se aleje de
 * la media general del evento (para no romper el balance de niveles).
 */
function groupCost(
  group: MixingParticipant[],
  exclusions: ExclusionRule[],
  overallAvgRating: number,
  config: MixingConfig
): number {
  let cost = 0
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const a = group[i]
      const b = group[j]
      if (hasNoContactExclusion(a, b, exclusions)) cost += NO_CONTACT_COST
      const shared = sharedGroupsThisEvent(a, b)
      cost += shared * shared * REPEAT_WEIGHT
    }
  }
  if (config.balanceStrategy === 'similar_levels') {
    const groupAvg = group.reduce((s, p) => s + p.rating, 0) / group.length
    cost += Math.abs(groupAvg - overallAvgRating) * BALANCE_WEIGHT
  }
  return cost
}

function totalGroupsCost(
  groups: MixingParticipant[][],
  exclusions: ExclusionRule[],
  overallAvgRating: number,
  config: MixingConfig
): number {
  return groups.reduce((sum, g) => sum + groupCost(g, exclusions, overallAvgRating, config), 0)
}

/**
 * Búsqueda local: prueba intercambiar un jugador entre dos pistas al azar y
 * se queda con el cambio si reduce (o no empeora) el coste total. Repetido
 * muchas veces, esto va "desenredando" a los jugadores que ya coincidieron
 * demasiadas veces, sin descontrolar el balance de nivel entre pistas.
 * Es el mecanismo que evita que el mismo grupo de 4 quede "atrapado" junto
 * ronda tras ronda — la causa raíz del bug de repetición de rivales.
 */
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
    if (candidateCost <= currentCost) {
      current = candidate
      currentCost = candidateCost
    }
  }

  return current
}

// 🆕 Nº de búsquedas locales independientes que se prueban por ronda,
// cada una con un reparto inicial distinto. Nos quedamos con la de menor
// coste total. Esto reduce mucho la probabilidad de que la búsqueda se
// quede "atascada" en una rotación subóptima (heurística, no garantiza el
// óptimo global, pero con varios intentos independientes la probabilidad de
// encontrar una rotación limpia sube muchísimo).
const RESTART_COUNT = 8

/**
 * Construye un reparto inicial (ordenar por rating + jitter + trocear) y
 * ejecuta la búsqueda local sobre él. Es "un intento" del multi-reinicio.
 */
function buildAndRepairOneAttempt(
  pool: MixingParticipant[],
  config: MixingConfig,
  exclusions: ExclusionRule[]
): { groups: MixingParticipant[][], leftovers: MixingParticipant[] } {
  const sorted = [...pool].sort((a, b) => {
    if (config.avoidRepetition) {
      const noise = 0.5
      const rA = a.rating + (Math.random() - 0.5) * noise
      const rB = b.rating + (Math.random() - 0.5) * noise
      return rB - rA
    }
    return b.rating - a.rating
  })

  const courtCount = Math.floor(sorted.length / 4)
  const usableCount = courtCount * 4
  const leftovers = sorted.slice(usableCount)
  const usable = sorted.slice(0, usableCount)

  let groups: MixingParticipant[][] = []
  for (let i = 0; i < courtCount; i++) {
    groups.push(usable.slice(i * 4, i * 4 + 4))
  }

  if (config.avoidRepetition && groups.length > 1) {
    groups = repairGroupsLocalSearch(groups, exclusions, config, REPAIR_ITERATIONS)
  }

  return { groups, leftovers }
}

/**
 * Forma los grupos de 4 para UNA ronda. Si avoidRepetition está activo,
 * prueba RESTART_COUNT intentos independientes de "ordenar + reparar" y se
 * queda con el de menor coste total (menos reencuentros + mejor balance).
 * Con un solo intento, un mal jitter inicial puede dejar a la búsqueda local
 * sin salida limpia (como le pasó a Javier con Jimmy+Trini); con varios
 * intentos, casi siempre aparece una rotación mejor.
 */
function planGroupsForRound(
  pool: MixingParticipant[],
  config: MixingConfig,
  exclusions: ExclusionRule[]
): { groups: MixingParticipant[][], leftovers: MixingParticipant[] } {
  if (!config.avoidRepetition) {
    // Sin "evitar repetición" activado, no tiene sentido gastar ciclos en
    // reintentos — el reparto es puramente por nivel, siempre el mismo.
    return buildAndRepairOneAttempt(pool, config, exclusions)
  }

  let best = buildAndRepairOneAttempt(pool, config, exclusions)
  let bestCost = totalGroupsCost(
    best.groups,
    exclusions,
    best.groups.flat().reduce((s, p) => s + p.rating, 0) / (best.groups.flat().length || 1),
    config
  )

  for (let attempt = 1; attempt < RESTART_COUNT; attempt++) {
    const candidate = buildAndRepairOneAttempt(pool, config, exclusions)
    const overallAvg = candidate.groups.flat().reduce((s, p) => s + p.rating, 0) / (candidate.groups.flat().length || 1)
    const candidateCost = totalGroupsCost(candidate.groups, exclusions, overallAvg, config)
    if (candidateCost < bestCost) {
      best = candidate
      bestCost = candidateCost
    }
  }

  return best
}

// ============================================================================
// CAPA 2 — Asignación de roles (quién es pareja de quién) DENTRO de un grupo
// ya formado por la Capa 1. Esta parte es la lógica que ya existía.
// ============================================================================

function resolveCourtRoles(
  group: MixingParticipant[],
  courtNumber: number,
  config: MixingConfig,
  exclusions: ExclusionRule[]
): MatchProposal {
  // Reordenamos por rating SOLO para decidir roles (p1=mejor...p4=peor);
  // el orden que trae el grupo desde la Capa 1 no importa aquí.
  const sortedGroup = [...group].sort((a, b) => b.rating - a.rating)
  const [p1, p2, p3, p4] = sortedGroup

  const permutations = [
    { id: 'custom', pairs: [[p1, p2], [p3, p4]] },
    { id: 'mid_balance', pairs: [[p1, p3], [p2, p4]] },
    { id: 'full_balance', pairs: [[p1, p4], [p2, p3]] }
  ]

  const hasHardPartnerIssue = (permPairs: [MixingParticipant, MixingParticipant][]): boolean =>
    permPairs.some(([a, b]) => classifyPartnerIssue(a, b, exclusions) !== null)

  const hasHardOpponentIssue = (permPairs: [MixingParticipant, MixingParticipant][]): boolean => {
    const [pairA, pairB] = permPairs
    const [a1, a2] = pairA
    const [b1, b2] = pairB
    return (
      classifyOpponentIssue(a1, b1, exclusions) === 'repetition' ||
      classifyOpponentIssue(a1, b2, exclusions) === 'repetition' ||
      classifyOpponentIssue(a2, b1, exclusions) === 'repetition' ||
      classifyOpponentIssue(a2, b2, exclusions) === 'repetition'
    )
  }

  const cleanPermutations = permutations.filter(perm => {
    const pairs = perm.pairs as [MixingParticipant, MixingParticipant][]
    return !hasHardPartnerIssue(pairs) && !hasHardOpponentIssue(pairs)
  })
  const usablePermutations = cleanPermutations.length > 0 ? cleanPermutations : permutations

  let bestPermutation = usablePermutations[usablePermutations.length - 1]
  let bestScore = -Infinity

  for (const perm of usablePermutations) {
    let score = 0
    const pairs = perm.pairs as [MixingParticipant, MixingParticipant][]
    const pairA = pairs[0]
    const pairB = pairs[1]

    if (config.balanceStrategy === 'similar_levels') {
      const teamARating = pairA[0].rating + pairA[1].rating
      const teamBRating = pairB[0].rating + pairB[1].rating
      score -= Math.abs(teamARating - teamBRating) * 10
    } else if (config.balanceStrategy === 'pro_am') {
      if (perm.id === 'full_balance') score += 50
    }

    if (config.forcePosition) {
      pairs.forEach(([a, b]) => { score += getPositionScore(a, b) })
    }

    if (exclusions.length > 0) {
      const [ea1, ea2] = pairA
      const [eb1, eb2] = pairB
      score += exclusionPenalty(ea1.id, ea2.id, true, exclusions)
      score += exclusionPenalty(eb1.id, eb2.id, true, exclusions)
      score += exclusionPenalty(ea1.id, eb1.id, false, exclusions)
      score += exclusionPenalty(ea1.id, eb2.id, false, exclusions)
      score += exclusionPenalty(ea2.id, eb1.id, false, exclusions)
      score += exclusionPenalty(ea2.id, eb2.id, false, exclusions)
    }

    if (config.avoidRepetition) {
      pairs.forEach(([a, b]) => {
        if (a.past_partners.includes(b.id) || b.past_partners.includes(a.id)) score -= 2000
      })
      const [a1, a2] = pairA
      const [b1, b2] = pairB
      let repetitionCount = 0
      if (a1.past_opponents.includes(b1.id)) repetitionCount++
      if (a1.past_opponents.includes(b2.id)) repetitionCount++
      if (a2.past_opponents.includes(b1.id)) repetitionCount++
      if (a2.past_opponents.includes(b2.id)) repetitionCount++
      score -= repetitionCount * 500
      if (a1.past_partners.includes(b1.id)) score -= 200
      if (a1.past_partners.includes(b2.id)) score -= 200
      if (a2.past_partners.includes(b1.id)) score -= 200
      if (a2.past_partners.includes(b2.id)) score -= 200
    }

    if (score > bestScore) {
      bestScore = score
      bestPermutation = perm
    }
  }

  const finalPairs = bestPermutation.pairs as [MixingParticipant, MixingParticipant][]
  const excludedViolated = exclusions.length > 0 && checkExclusionViolation(finalPairs[0], finalPairs[1], exclusions)
  const opponentViolated = hasHardOpponentIssue(finalPairs)

  const warningMsgs: string[] = []
  if (excludedViolated) warningMsgs.push('No fue posible respetar todas las exclusiones en esta pista')
  if (opponentViolated) warningMsgs.push('No fue posible evitar que estos jugadores repitan como rivales en este evento')

  return {
    courtNumber,
    player1: finalPairs[0][0],
    player2: finalPairs[0][1],
    player3: finalPairs[1][0],
    player4: finalPairs[1][1],
    pairA: finalPairs[0],
    pairB: finalPairs[1],
    ...(warningMsgs.length > 0 ? { warning: warningMsgs.join(' ') } : {})
  }
}

function getPositionScore(a: MixingParticipant, b: MixingParticipant): number {
  const posA = a.court_position
  const posB = b.court_position

  if (posA === 'drive' && posB === 'reves') return 20
  if (posA === 'reves' && posB === 'drive') return 20

  if (posA === 'ambos' || posB === 'ambos') return 15

  if (posA === posB) return -50 // Drive+Drive o Revés+Revés sin nadie "ambos"

  return 0
}

// ============================================================================
// Serpentín (pro_am) — mismo principio de rotación aplicado a su formación
// de parejas top-vs-bottom.
// ============================================================================

/**
 * Repara el array de parejas del método Serpentín intercambiando un miembro
 * entre dos parejas cuando una de ellas viola una exclusión, repite pareja,
 * o ya ha compartido grupo este evento (reencuentro evitable). Prueba las 2
 * particiones posibles entre cada par de parejas candidatas y acepta la de
 * menor distorsión de balance de nivel que no introduzca un problema nuevo.
 * Best-effort: si no hay intercambio válido, la pareja queda como estaba y
 * se marca en `unresolved` (solo si el motivo es un hard constraint real).
 */
function repairSnakePairs(
  pairs: [MixingParticipant, MixingParticipant][],
  exclusions: ExclusionRule[]
): { pairs: [MixingParticipant, MixingParticipant][], unresolved: Map<number, PartnerIssueReason> } {
  const result = [...pairs]

  // Motivo "duro" (bloquea de verdad): exclusión o pareja repetida.
  const hardReason = (a: MixingParticipant, b: MixingParticipant) => classifyPartnerIssue(a, b, exclusions)
  // Motivo "a mejorar si se puede" (incluye también reencuentros ya
  // ocurridos este evento en cualquier rol) — más amplio, usado solo para
  // decidir A QUÉ parejas merece la pena intentar rotar.
  const repairReason = (a: MixingParticipant, b: MixingParticipant): PartnerIssueReason | null => {
    const hard = hardReason(a, b)
    if (hard) return hard
    return sharedGroupsThisEvent(a, b) > 0 ? 'repetition' : null
  }
  const isRepairCandidate = (a: MixingParticipant, b: MixingParticipant) => repairReason(a, b) !== null
  const rank = (r: PartnerIssueReason | null) => (r === 'exclusion' ? 0 : 1)

  const badIndices = result
    .map((_, i) => i)
    .filter(i => isRepairCandidate(result[i][0], result[i][1]))
    .sort((i, j) => rank(repairReason(result[i][0], result[i][1])) - rank(repairReason(result[j][0], result[j][1])))

  const unresolved = new Map<number, PartnerIssueReason>()

  for (const i of badIndices) {
    if (!isRepairCandidate(result[i][0], result[i][1])) continue // ya se arregló como efecto colateral

    const [x1, x2] = result[i]
    let bestJ = -1
    let bestCost = Infinity
    let bestReplacement: [[MixingParticipant, MixingParticipant], [MixingParticipant, MixingParticipant]] | null = null

    for (let j = 0; j < result.length; j++) {
      if (j === i) continue
      const [y1, y2] = result[j]
      const originalGap = Math.abs(x1.rating - x2.rating) + Math.abs(y1.rating - y2.rating)

      const candidates: [[MixingParticipant, MixingParticipant], [MixingParticipant, MixingParticipant]][] = [
        [[x1, y1], [x2, y2]],
        [[x1, y2], [x2, y1]],
      ]

      for (const [newI, newJ] of candidates) {
        if (isRepairCandidate(newI[0], newI[1]) || isRepairCandidate(newJ[0], newJ[1])) continue
        const newGap = Math.abs(newI[0].rating - newI[1].rating) + Math.abs(newJ[0].rating - newJ[1].rating)
        const cost = Math.abs(newGap - originalGap)
        if (cost < bestCost) {
          bestCost = cost
          bestJ = j
          bestReplacement = [newI, newJ]
        }
      }
    }

    if (bestJ !== -1 && bestReplacement) {
      result[i] = bestReplacement[0]
      result[bestJ] = bestReplacement[1]
    } else {
      const reason = hardReason(result[i][0], result[i][1])
      if (reason) unresolved.set(i, reason) // solo avisamos si es un hard constraint real, no un simple "sería mejor evitarlo"
    }
  }

  return { pairs: result, unresolved }
}

function getPairGroupings(indices: number[], groupCount: number): [number, number][][] {
  if (groupCount === 0) return [[]]
  const [first, ...rest] = indices
  const result: [number, number][][] = []
  for (let i = 0; i < rest.length; i++) {
    const second = rest[i]
    const remaining = rest.filter((_, j) => j !== i)
    for (const sub of getPairGroupings(remaining, groupCount - 1)) {
      result.push([[first, second], ...sub])
    }
  }
  return result
}

function generateSnakeRound(
  participants: MixingParticipant[],
  config: MixingConfig,
  exclusions: ExclusionRule[] = []
): RoundProposal {
  const sorted = [...participants].sort((a, b) => {
    if (config.avoidRepetition) {
      const noise = 0.5
      const rA = a.rating + (Math.random() - 0.5) * noise
      const rB = b.rating + (Math.random() - 0.5) * noise
      return rB - rA
    }
    return b.rating - a.rating
  })

  const courtCount = Math.floor(sorted.length / 4)
  const usableCount = courtCount * 4
  const leftovers = sorted.slice(usableCount)
  const usable = sorted.slice(0, usableCount)
  const halfN = usableCount / 2

  const snakePairs: [MixingParticipant, MixingParticipant][] = []
  for (let i = 0; i < halfN; i++) {
    snakePairs.push([usable[i], usable[usableCount - 1 - i]])
  }

  const { pairs, unresolved } = repairSnakePairs(snakePairs, exclusions)

  const buildMatch = (pairA: [MixingParticipant, MixingParticipant], pairB: [MixingParticipant, MixingParticipant], courtNumber: number): MatchProposal => ({
    courtNumber,
    player1: pairA[0], player2: pairA[1],
    player3: pairB[0], player4: pairB[1],
    pairA, pairB
  })

  const hasHardOpponentIssue = (pA: [MixingParticipant, MixingParticipant], pB: [MixingParticipant, MixingParticipant]): boolean => {
    const [a1, a2] = pA
    const [b1, b2] = pB
    return (
      classifyOpponentIssue(a1, b1, exclusions) === 'repetition' ||
      classifyOpponentIssue(a1, b2, exclusions) === 'repetition' ||
      classifyOpponentIssue(a2, b1, exclusions) === 'repetition' ||
      classifyOpponentIssue(a2, b2, exclusions) === 'repetition'
    )
  }

  const buildWarning = (idxA: number, idxB: number, pA: [MixingParticipant, MixingParticipant], pB: [MixingParticipant, MixingParticipant]): string | undefined => {
    const msgs: string[] = []
    if (exclusions.length > 0 && checkExclusionViolation(pA, pB, exclusions)) {
      msgs.push('No fue posible respetar todas las exclusiones en esta pista')
    }
    if (unresolved.get(idxA) === 'repetition' || unresolved.get(idxB) === 'repetition') {
      msgs.push('No fue posible evitar que esta pareja repita respecto a una ronda anterior de este evento')
    }
    if (hasHardOpponentIssue(pA, pB)) {
      msgs.push('No fue posible evitar que estos jugadores repitan como rivales en este evento')
    }
    return msgs.length > 0 ? msgs.join(' ') : undefined
  }

  const scoreGrouping = (grouping: [number, number][]): number => {
    let score = 0
    for (const [aIdx, bIdx] of grouping) {
      const pA = pairs[aIdx]
      const pB = pairs[bIdx]
      const [a1, a2, b1, b2] = [pA[0], pA[1], pB[0], pB[1]]
      score += exclusionPenalty(a1.id, a2.id, true, exclusions)
      score += exclusionPenalty(b1.id, b2.id, true, exclusions)
      score += exclusionPenalty(a1.id, b1.id, false, exclusions)
      score += exclusionPenalty(a1.id, b2.id, false, exclusions)
      score += exclusionPenalty(a2.id, b1.id, false, exclusions)
      score += exclusionPenalty(a2.id, b2.id, false, exclusions)
      if (a1.past_partners.includes(a2.id)) score -= 2000
      if (b1.past_partners.includes(b2.id)) score -= 2000
      if (a1.past_opponents.includes(b1.id)) score -= 500
      if (a1.past_opponents.includes(b2.id)) score -= 500
      if (a2.past_opponents.includes(b1.id)) score -= 500
      if (a2.past_opponents.includes(b2.id)) score -= 500
      if (a1.past_partners.includes(b1.id)) score -= 200
      if (a1.past_partners.includes(b2.id)) score -= 200
      if (a2.past_partners.includes(b1.id)) score -= 200
      if (a2.past_partners.includes(b2.id)) score -= 200
      const diff = Math.abs((a1.rating + a2.rating) - (b1.rating + b2.rating))
      score -= diff * 10
      // 🆕 penaliza fuerte cualquier reencuentro ya ocurrido este evento
      const pairsInMatch: [MixingParticipant, MixingParticipant][] = [[a1, a2], [b1, b2], [a1, b1], [a1, b2], [a2, b1], [a2, b2]]
      for (const [x, y] of pairsInMatch) {
        const shared = sharedGroupsThisEvent(x, y)
        score -= shared * shared * 300
      }
    }
    return score
  }

  const matches: MatchProposal[] = []

  if (config.avoidRepetition) {
    const pairIndices = Array.from({ length: halfN }, (_, i) => i)
    const groupings = getPairGroupings(pairIndices, courtCount)

    const hasHardOpponentIssueInGrouping = (grouping: [number, number][]): boolean =>
      grouping.some(([aIdx, bIdx]) => hasHardOpponentIssue(pairs[aIdx], pairs[bIdx]))

    const cleanGroupings = groupings.filter(g => !hasHardOpponentIssueInGrouping(g))
    const usableGroupings = cleanGroupings.length > 0 ? cleanGroupings : groupings

    let bestScore = -Infinity
    let bestGrouping = usableGroupings[0]
    for (const g of usableGroupings) {
      const s = scoreGrouping(g)
      if (s > bestScore) { bestScore = s; bestGrouping = g }
    }
    bestGrouping.forEach(([aIdx, bIdx], courtIdx) => {
      const pA = pairs[aIdx]
      const pB = pairs[bIdx]
      const warning = buildWarning(aIdx, bIdx, pA, pB)
      matches.push({
        ...buildMatch(pA, pB, courtIdx + 1),
        ...(warning ? { warning } : {})
      })
    })
  } else {
    for (let i = 0; i < courtCount; i++) {
      const aIdx = i
      const bIdx = halfN - 1 - i
      const pA = pairs[aIdx]
      const pB = pairs[bIdx]
      const warning = buildWarning(aIdx, bIdx, pA, pB)
      matches.push({
        ...buildMatch(pA, pB, i + 1),
        ...(warning ? { warning } : {})
      })
    }
  }

  return { matches, leftovers }
}

// ============================================================================
// Puntos de entrada públicos
// ============================================================================

/**
 * Genera UNA ronda de partidos. Mantiene la firma de siempre — internamente
 * ahora usa el planificador de grupos (Capa 1) + asignación de roles (Capa 2)
 * para 'similar_levels', y el Serpentín mejorado para 'pro_am'.
 */
export function generateMixingRound(
  participants: MixingParticipant[],
  config: MixingConfig
): RoundProposal {
  const exclusions = config.exclusions ?? []
  if (config.balanceStrategy === 'pro_am') return generateSnakeRound(participants, config, exclusions)

  const { groups, leftovers } = planGroupsForRound(participants, config, exclusions)
  const matches = groups.map((group, i) => resolveCourtRoles(group, i + 1, config, exclusions))
  return { matches, leftovers }
}

/**
 * 🆕 Actualiza el historial en memoria de los participantes tras una ronda
 * (pareja, rival, contador de rivalidad). Centralizado aquí para que
 * page.tsx nunca tenga que reimplementar esta lógica — así se evita que el
 * nombre de un campo se desincronice entre archivos (como ya ha pasado).
 */
export function applyRoundToHistory(participants: MixingParticipant[], matches: MatchProposal[]): void {
  const updateHistory = (pid: string, partnerId: string, opponents: string[]) => {
    const p = participants.find(cp => cp.id === pid)
    if (!p) return
    if (!p.past_partners.includes(partnerId)) p.past_partners.push(partnerId)
    if (!p.current_event_partners.includes(partnerId)) p.current_event_partners.push(partnerId)
    if (!p.opponent_counts) p.opponent_counts = {}
    opponents.forEach(oid => {
      if (!p.past_opponents.includes(oid)) p.past_opponents.push(oid)
      p.opponent_counts![oid] = (p.opponent_counts![oid] || 0) + 1
    })
  }

  matches.forEach(m => {
    updateHistory(m.player1.id, m.player2.id, [m.player3.id, m.player4.id])
    updateHistory(m.player2.id, m.player1.id, [m.player3.id, m.player4.id])
    updateHistory(m.player3.id, m.player4.id, [m.player1.id, m.player2.id])
    updateHistory(m.player4.id, m.player3.id, [m.player1.id, m.player2.id])
  })
}

/**
 * 🆕 Nuevo punto de entrada principal: genera TODAS las rondas de un evento
 * de una vez, actualizando el historial entre cada una para que la Capa 1
 * de la siguiente ronda "vea" los reencuentros ya ocurridos y rote los
 * grupos en consecuencia. Sustituye al bucle manual que antes vivía en
 * page.tsx.
 */
export function generateEventRounds(
  participants: MixingParticipant[],
  config: MixingConfig,
  roundsCount: number
): RoundProposal[] {
  const working: MixingParticipant[] = participants.map(p => ({
    ...p,
    past_partners: [...p.past_partners],
    past_opponents: [...p.past_opponents],
    current_event_partners: [...p.current_event_partners],
    opponent_counts: { ...(p.opponent_counts ?? {}) },
  }))

  const rounds: RoundProposal[] = []
  for (let i = 0; i < roundsCount; i++) {
    const round = generateMixingRound(working, config)
    rounds.push(round)
    applyRoundToHistory(working, round.matches)
  }
  return rounds
}
