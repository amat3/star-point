import { describe, it, expect } from 'vitest'
import { generateMixingRound, MixingParticipant, MixingConfig, ExclusionRule, MatchProposal } from './mixing-algorithm'

// Nota: el incentivo de emparejamiento forzado (ForcedPairingRule) vive en la
// rama feature/round-incentive, no mergeada a main — no se testea aquí.

function makeParticipants(n: number): MixingParticipant[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    rating: 5 - i * 0.1,
    gender: 'otro' as const,
    court_position: i % 2 === 0 ? 'drive' as const : 'reves' as const,
    full_name: `Player ${i}`,
    past_partners: [],
    past_opponents: [],
    current_event_partners: [],
    is_guest: false,
  }))
}

// Replica el bucle de `handleGenerate` (generate/page.tsx): actualiza el
// historial en memoria entre rondas de un mismo evento antes de la siguiente
// llamada a generateMixingRound.
function applyRoundHistory(participants: MixingParticipant[], matches: MatchProposal[]) {
  const updateHistory = (pid: string, partnerId: string, opponents: string[]) => {
    const p = participants.find(cp => cp.id === pid)
    if (!p) return
    if (!p.past_partners.includes(partnerId)) p.past_partners.push(partnerId)
    if (!p.current_event_partners.includes(partnerId)) p.current_event_partners.push(partnerId)
    opponents.forEach(oid => { if (!p.past_opponents.includes(oid)) p.past_opponents.push(oid) })
  }
  matches.forEach(m => {
    updateHistory(m.player1.id, m.player2.id, [m.player3.id, m.player4.id])
    updateHistory(m.player2.id, m.player1.id, [m.player3.id, m.player4.id])
    updateHistory(m.player3.id, m.player4.id, [m.player1.id, m.player2.id])
    updateHistory(m.player4.id, m.player3.id, [m.player1.id, m.player2.id])
  })
}

function findMatch(matches: MatchProposal[], id: string) {
  return matches.find(m => [m.player1.id, m.player2.id, m.player3.id, m.player4.id].includes(id))
}

function arePartners(match: MatchProposal, a: string, b: string) {
  return (match.pairA[0].id === a && match.pairA[1].id === b) ||
         (match.pairA[0].id === b && match.pairA[1].id === a) ||
         (match.pairB[0].id === a && match.pairB[1].id === b) ||
         (match.pairB[0].id === b && match.pairB[1].id === a)
}

const baseConfig: MixingConfig = {
  genderMode: 'open',
  balanceStrategy: 'similar_levels',
  avoidRepetition: true,
  forcePosition: false,
}

describe('generateMixingRound — casos base', () => {
  it('reparte en pistas completas sin sobrantes cuando N es múltiplo de 4', () => {
    const result = generateMixingRound(makeParticipants(12), baseConfig)
    expect(result.matches).toHaveLength(3)
    expect(result.leftovers).toHaveLength(0)
  })

  it('detecta correctamente los sobrantes cuando N no es múltiplo de 4', () => {
    const result = generateMixingRound(makeParticipants(10), baseConfig)
    expect(result.matches).toHaveLength(2)
    expect(result.leftovers).toHaveLength(2)
  })

  it('respeta una exclusión no_partner cuando existe alternativa viable', () => {
    const exclusions: ExclusionRule[] = [{ playerA: 'p0', playerB: 'p1', type: 'no_partner' }]
    const result = generateMixingRound(makeParticipants(12), { ...baseConfig, exclusions })
    const match = findMatch(result.matches, 'p0')
    expect(match && arePartners(match, 'p0', 'p1')).toBe(false)
  })

  it('evita repetir pareja cuando hay una agrupación alternativa disponible', () => {
    const participants = makeParticipants(12)
    // p0 y p1 ya jugaron juntos como pareja
    participants[0].past_partners.push('p1')
    participants[1].past_partners.push('p0')
    const result = generateMixingRound(participants, baseConfig)
    const match = findMatch(result.matches, 'p0')
    expect(match && arePartners(match, 'p0', 'p1')).toBe(false)
  })

  it('con forcePosition activo, prefiere parejas drive+revés sobre drive+drive', () => {
    // avoidRepetition:false para que no haya jitter aleatorio en el orden por
    // rating — así cada pista recibe siempre exactamente 2 drive + 2 revés
    // (los participantes alternan posición por índice) y el resultado es determinista.
    const result = generateMixingRound(makeParticipants(12), { ...baseConfig, avoidRepetition: false, forcePosition: true })
    for (const match of result.matches) {
      const pairPositions = (pair: [MixingParticipant, MixingParticipant]) => [pair[0].court_position, pair[1].court_position]
      const [a1, a2] = pairPositions(match.pairA)
      const [b1, b2] = pairPositions(match.pairB)
      // Ninguna pareja debería ser drive+drive o reves+reves cuando hay alternativas complementarias disponibles
      expect(a1 === a2).toBe(false)
      expect(b1 === b2).toBe(false)
    }
  })

  it('ambas estrategias generan partidos completos y válidos', () => {
    for (const balanceStrategy of ['similar_levels', 'pro_am'] as const) {
      const result = generateMixingRound(makeParticipants(12), { ...baseConfig, balanceStrategy })
      expect(result.matches).toHaveLength(3)
      result.matches.forEach(m => {
        const ids = [m.player1.id, m.player2.id, m.player3.id, m.player4.id]
        expect(new Set(ids).size).toBe(4) // 4 jugadores distintos por partido
      })
    }
  })
})

describe('generateMixingRound — Serpentín (pro_am): no repetir pareja dentro del evento', () => {
  // Ratings muy separados para que el orden sea estable pese al jitter (±0.25)
  // de avoidRepetition, sin necesidad de mockear Math.random.
  function makeSpreadParticipants(n: number): MixingParticipant[] {
    return makeParticipants(n).map((p, i) => ({ ...p, rating: 100 - i * 10 }))
  }

  it('el mejor y el peor rankeado no repiten pareja en 3 rondas consecutivas (pueden serlo una vez, nunca dos)', () => {
    const participants = makeSpreadParticipants(12)
    const config: MixingConfig = { ...baseConfig, balanceStrategy: 'pro_am' }
    let timesPaired = 0

    for (let round = 0; round < 3; round++) {
      const result = generateMixingRound(participants, config)
      const match = findMatch(result.matches, 'p0')
      if (match && arePartners(match, 'p0', 'p11')) timesPaired++
      applyRoundHistory(participants, result.matches)
    }

    expect(timesPaired).toBeLessThanOrEqual(1)
  })

  it('respeta una exclusión no_partner incluso cuando el patrón serpentín los empareja por defecto', () => {
    const participants = makeSpreadParticipants(8)
    const exclusions: ExclusionRule[] = [{ playerA: 'p0', playerB: 'p7', type: 'no_partner' }]
    const result = generateMixingRound(participants, { ...baseConfig, balanceStrategy: 'pro_am', exclusions })
    const match = findMatch(result.matches, 'p0')
    expect(match && arePartners(match, 'p0', 'p7')).toBe(false)
    expect(match?.warning).toBeUndefined()
  })

  it('permite repetir pareja con un evento anterior (preferencia soft, no bloqueo)', () => {
    // past_partners (histórico global) tiene la repetición, pero
    // current_event_partners (este evento) está vacío — no debe bloquearse.
    const participants = makeSpreadParticipants(4)
    participants[0].past_partners.push('p3')
    participants[3].past_partners.push('p0')
    const result = generateMixingRound(participants, { ...baseConfig, balanceStrategy: 'pro_am' })
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0].warning).toBeUndefined()
  })
})

describe('generateMixingRound — similar_levels: filtro duro de repetición dentro del evento', () => {
  it('descarta permutaciones que repiten pareja del evento actual aunque el balance de nivel las favorezca', () => {
    const participants = makeParticipants(4).map((p, i) => ({ ...p, rating: [1000, 1, 1, 0][i] }))
    // p0 y p2 ya son pareja en ESTE evento (mid_balance: p0+p2 vs p1+p3)
    participants[0].current_event_partners.push('p2')
    participants[2].current_event_partners.push('p0')
    const result = generateMixingRound(participants, { ...baseConfig, balanceStrategy: 'similar_levels' })
    const match = result.matches[0]
    expect(arePartners(match, 'p0', 'p2')).toBe(false)
  })
})
