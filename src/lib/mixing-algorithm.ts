
export interface MixingParticipant {
  id: string
  rating: number
  gender: 'masculino' | 'femenino' | 'otro'
  court_position: 'reves' | 'drive' | 'ambos'
  full_name: string
  past_partners: string[]
  past_opponents: string[]
  is_guest?: boolean
}

export interface MixingConfig {
  genderMode: 'open' | 'mixed' | 'separated'
  balanceStrategy: 'similar_levels' | 'pro_am'
  avoidRepetition: boolean
  forcePosition: boolean
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

/**
 * Main function to generate a round of matches
 */
export function generateMixingRound(
  participants: MixingParticipant[],
  config: MixingConfig
): RoundProposal {
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
        
        // C. Repetition Score
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
    
    matches.push({
        courtNumber,
        player1: finalPairs[0][0],
        player2: finalPairs[0][1],
        player3: finalPairs[1][0],
        player4: finalPairs[1][1],
        pairA: finalPairs[0],
        pairB: finalPairs[1]
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
    let score = 0
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
