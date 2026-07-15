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
    is_guest: false,
  }))
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
