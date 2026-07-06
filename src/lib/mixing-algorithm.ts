
export interface MixingParticipant {
  id: string
  rating: number
  gender: 'masculino' | 'femenino' | 'otro'
  court_position: 'reves' | 'drive' | 'ambos'
  full_name: string
  avatar_url?: string | null
  past_partners: string[]
  past_opponents: string[]
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

  // Snake pairs: P[0]+P[n-1], P[1]+P[n-2], ...
  const pairs: [MixingParticipant, MixingParticipant][] = []
  for (let i = 0; i < halfN; i++) {
    pairs.push([usable[i], usable[usableCount - 1 - i]])
  }

  const buildMatch = (pairA: [MixingParticipant, MixingParticipant], pairB: [MixingParticipant, MixingParticipant], courtNumber: number): MatchProposal => ({
    courtNumber,
    player1: pairA[0], player2: pairA[1],
    player3: pairB[0], player4: pairB[1],
    pairA, pairB
  })

  const scoreGrouping = (grouping: [number, number][]): number => {
    let score = 0
    for (const [aIdx, bIdx] of grouping) {
      const pA = pairs[aIdx]
      const pB = pairs[bIdx]
      const [a1, a2, b1, b2] = [pA[0], pA[1], pB[0], pB[1]]
      // Hard exclusions (overriding priority)
      score += exclusionPenalty(a1.id, a2.id, true, exclusions)
      score += exclusionPenalty(b1.id, b2.id, true, exclusions)
      score += exclusionPenalty(a1.id, b1.id, false, exclusions)
      score += exclusionPenalty(a1.id, b2.id, false, exclusions)
      score += exclusionPenalty(a2.id, b1.id, false, exclusions)
      score += exclusionPenalty(a2.id, b2.id, false, exclusions)
      // Soft history
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
    }
    return score
  }

  const matches: MatchProposal[] = []

  if (config.avoidRepetition) {
    const pairIndices = Array.from({ length: halfN }, (_, i) => i)
    const groupings = getPairGroupings(pairIndices, courtCount)
    let bestScore = -Infinity
    let bestGrouping = groupings[0]
    for (const g of groupings) {
      const s = scoreGrouping(g)
      if (s > bestScore) { bestScore = s; bestGrouping = g }
    }
    bestGrouping.forEach(([aIdx, bIdx], courtIdx) => {
      const pA = pairs[aIdx]
      const pB = pairs[bIdx]
      const violated = exclusions.length > 0 && checkExclusionViolation(pA, pB, exclusions)
      matches.push({
        ...buildMatch(pA, pB, courtIdx + 1),
        ...(violated ? { warning: 'No fue posible respetar todas las exclusiones en esta pista' } : {})
      })
    })
  } else {
    for (let i = 0; i < courtCount; i++) {
      const pA = pairs[i]
      const pB = pairs[halfN - 1 - i]
      const violated = exclusions.length > 0 && checkExclusionViolation(pA, pB, exclusions)
      matches.push({
        ...buildMatch(pA, pB, i + 1),
        ...(violated ? { warning: 'No fue posible respetar todas las exclusiones en esta pista' } : {})
      })
    }
  }

  return { matches, leftovers }
}

/**
 * Main function to generate a round of matches
 */
export function generateMixingRound(
  participants: MixingParticipant[],
  config: MixingConfig
): RoundProposal {
  const exclusions = config.exclusions ?? []
  if (config.balanceStrategy === 'pro_am') return generateSnakeRound(participants, config, exclusions)

  // 1. Sort by Rating (High to Low)
  // If 'avoidRepetition' is ON, we add a small "jitter" to the rating to allow
  // players on the border of a court group (e.g. #4 and #5) to swap places.
  // This promotes "socialization" across courts as requested.
  const sorted = [...participants].sort((a, b) => {
      if (config.avoidRepetition) {
          // Jitter range: +/- 0.25 (Total 0.5 variation)
          // Enough to mix close levels, but preserves general hierarchy.
          const noise = 0.5 
          const ratingA = a.rating + ((Math.random() - 0.5) * noise)
          const ratingB = b.rating + ((Math.random() - 0.5) * noise)
          return ratingB - ratingA
      }
      return b.rating - a.rating
  })

  const matches: MatchProposal[] = []
  const leftovers: MixingParticipant[] = []
  
  // 2. Chunk into groups of 4 (Courts)
  // TODO: Handle gender separation if mode is 'separated' or 'mixed' specific logic
  // For 'open', we just take the top 4, then next 4...
  
  const courtCount = Math.floor(sorted.length / 4)
  
  for (let i = 0; i < courtCount; i++) {
    const group = sorted.slice(i * 4, (i * 4) + 4)
    const courtNumber = i + 1
    
    // Players for this court:
    // P1 (Best), P2, P3, P4 (Worst in this group)
    const [p1, p2, p3, p4] = group
    
    // 3. Generate Permutations using the indices 0,1,2,3 from the group array
    // Case A: (0+1) vs (2+3) -> Best 2 vs Worst 2 (Usually very unbalanced)
    // Case B: (0+2) vs (1+3) -> 1st+3rd vs 2nd+4th
    // Case C: (0+3) vs (1+2) -> 1st+4th vs 2nd+3rd (Usually most balanced aka 'similar_levels')
    
    const permutations = [
      { id: 'custom', pairs: [[p1, p2], [p3, p4]] },
      { id: 'mid_balance', pairs: [[p1, p3], [p2, p4]] },
      { id: 'full_balance', pairs: [[p1, p4], [p2, p3]] }
    ]

    let bestPermutation = permutations[2] // Default to full_balance (1+4 vs 2+3)
    let bestScore = -Infinity
    
    // Evaluate permutations
    for (const perm of permutations) {
        let score = 0
        const pairs = perm.pairs as [MixingParticipant, MixingParticipant][]
        const pairA = pairs[0]
        const pairB = pairs[1]
        
        // A. Balance Strategy Score
        if (config.balanceStrategy === 'similar_levels') {
            // Prefer balanced matches (Team A rating approx Team B rating)
            const teamARating = pairA[0].rating + pairA[1].rating
            const teamBRating = pairB[0].rating + pairB[1].rating
            const diff = Math.abs(teamARating - teamBRating)
            // Lower diff is better. 
            // Max typical rating sum diff might be ~2-3. We subtract diff * 10.
            score -= (diff * 10)
        } else if (config.balanceStrategy === 'pro_am') {
             // 'pro_am' logic: "emparejar al mejor de la pista con el más bajo" -> 1+4.
             // This matches 'full_balance' naturally (0+3).
             // We can heavily weight the presence of (0+3) pairing.
             if (perm.id === 'full_balance') score += 50
        }
        
        // B. Position Score
        if (config.forcePosition) {
            pairs.forEach(pair => {
                const [a, b] = pair
                score += getPositionScore(a, b)
            })
        }
        
        // C. Hard exclusions
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

        // D. Repetition Score
        if (config.avoidRepetition) {
            // 1. Avoid repeating Partners (Critical) - Check Pair Internal
            pairs.forEach(pair => {
                const [a, b] = pair
                if (a.past_partners.includes(b.id) || b.past_partners.includes(a.id)) {
                    score -= 2000 // Huge penalty for repeating pairs
                }
            })

            // 2. Avoid repeating Opponents (High Priority) - Check Pair A vs Pair B
            const [a1, a2] = pairA
            const [b1, b2] = pairB
            
            // Check if any A played against any B
            // A1 vs B1, A1 vs B2, A2 vs B1, A2 vs B2
            let repetitionCount = 0
            if (a1.past_opponents.includes(b1.id)) repetitionCount++
            if (a1.past_opponents.includes(b2.id)) repetitionCount++
            if (a2.past_opponents.includes(b1.id)) repetitionCount++
            if (a2.past_opponents.includes(b2.id)) repetitionCount++
            
            // Penalty per repetition
            score -= (repetitionCount * 500)
            
            // 3. Avoid previous partners becoming opponents? (Optional)
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
    const violated = exclusions.length > 0 && checkExclusionViolation(finalPairs[0], finalPairs[1], exclusions)

    matches.push({
        courtNumber,
        player1: finalPairs[0][0],
        player2: finalPairs[0][1],
        player3: finalPairs[1][0],
        player4: finalPairs[1][1],
        pairA: finalPairs[0],
        pairB: finalPairs[1],
        ...(violated ? { warning: 'No fue posible respetar todas las exclusiones en esta pista' } : {})
    })
  }

  // Handle leftovers
  const processedCount = courtCount * 4
  if (processedCount < sorted.length) {
      leftovers.push(...sorted.slice(processedCount))
  }

  return { matches, leftovers }
}

function getPositionScore(a: MixingParticipant, b: MixingParticipant): number {
    const posA = a.court_position
    const posB = b.court_position
    
    // Ideal: ONE drive + ONE reves
    // Or: ONE side + ONE ambos
    // Or: TWO ambos
    
    // Perfect coverage
    if (posA === 'drive' && posB === 'reves') return 20
    if (posA === 'reves' && posB === 'drive') return 20
    
    // Good flexible coverage
    if (posA === 'ambos' || posB === 'ambos') {
        // If we have distinct bad clash (e.g. drive + drive) but one is ambos, it's fine
        // But pure 'drive' + 'drive' (if strictly interpreted) is bad.
        // If one is ambos, they can switch.
        return 15 
    }
    
    // Bad: Drive + Drive or Reves + Reves (where neither is ambos)
    if (posA === posB) {
        return -50 // Heavy penalty
    }
    
    return 0
}
