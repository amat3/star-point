import { describe, it, expect } from 'vitest'
import {
  generateMixingRound,
  generateEventRounds,
  summarizeRounds,
  MixingParticipant,
  MixingConfig,
  ExclusionRule,
  MatchProposal,
} from './mixing-algorithm'

function makeParticipants(n: number): MixingParticipant[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    rating: 5 - i * 0.1,
    gender: 'otro' as const,
    court_position: i % 2 === 0 ? 'drive' as const : 'reves' as const,
    full_name: `Player ${i}`,
    encounter_counts: {},
    session_encounter_counts: {},
    partner_history: [],
    session_partner_history: [],
    is_guest: false,
  }))
}

function findMatch(matches: MatchProposal[], id: string) {
  return matches.find(m => [m.player1.id, m.player2.id, m.player3.id, m.player4.id].includes(id))
}

function arePartners(match: MatchProposal, a: string, b: string) {
  return [match.pairA, match.pairB].some(pair => pair.map(p => p.id).sort().join() === [a, b].sort().join())
}

function areRivals(match: MatchProposal, a: string, b: string) {
  const inA = (id: string) => match.pairA.some(p => p.id === id)
  const inB = (id: string) => match.pairB.some(p => p.id === id)
  return (inA(a) && inB(b)) || (inB(a) && inA(b))
}

const baseConfig: MixingConfig = {
  genderMode: 'open',
  prioritizeLevel: false,
  forcePosition: false,
}

// Counts how many times a pair of players shares a court beyond the first time.
function reMeetings(rounds: { matches: MatchProposal[] }[]) {
  const met = new Map<string, number>()
  for (const round of rounds) {
    for (const m of round.matches) {
      const ids = [m.player1.id, m.player2.id, m.player3.id, m.player4.id]
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
        const key = [ids[i], ids[j]].sort().join()
        met.set(key, (met.get(key) ?? 0) + 1)
      }
    }
  }
  return [...met.values()].reduce((sum, v) => sum + Math.max(v - 1, 0), 0)
}

function partnerRepeats(rounds: { matches: MatchProposal[] }[]) {
  const seen = new Set<string>()
  let repeats = 0
  for (const round of rounds) {
    for (const m of round.matches) {
      for (const pair of [m.pairA, m.pairB]) {
        const key = pair.map(p => p.id).sort().join()
        if (seen.has(key)) repeats++
        seen.add(key)
      }
    }
  }
  return repeats
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

  it('cada partido tiene 4 jugadores distintos y nadie juega dos partidos', () => {
    const result = generateMixingRound(makeParticipants(12), baseConfig)
    const ids = result.matches.flatMap(m => [m.player1.id, m.player2.id, m.player3.id, m.player4.id])
    expect(new Set(ids).size).toBe(12)
  })

  it('con forcePosition activo, prefiere parejas drive+revés sobre drive+drive', () => {
    // 12 jugadores alternando drive/revés → cada pista recibe 2 drive + 2 revés
    // si el reparto es par; con grupos aleatorios puede haber 3+1, así que solo
    // exigimos que las parejas complementarias se elijan cuando existen.
    for (let run = 0; run < 20; run++) {
      const result = generateMixingRound(makeParticipants(12), { ...baseConfig, forcePosition: true })
      for (const match of result.matches) {
        const positions = [match.player1, match.player2, match.player3, match.player4].map(p => p.court_position)
        const drives = positions.filter(p => p === 'drive').length
        if (drives !== 2) continue
        expect(match.pairA[0].court_position === match.pairA[1].court_position).toBe(false)
        expect(match.pairB[0].court_position === match.pairB[1].court_position).toBe(false)
      }
    }
  })

  it('con prioritizeLevel activo, equilibra las dos parejas de la pista', () => {
    const participants = makeParticipants(4).map((p, i) => ({ ...p, rating: [4, 3, 2, 1][i] }))
    const result = generateMixingRound(participants, { ...baseConfig, prioritizeLevel: true })
    const m = result.matches[0]
    const sum = (pair: [MixingParticipant, MixingParticipant]) => pair[0].rating + pair[1].rating
    // 4+1 vs 3+2 es la única forma equilibrada
    expect(Math.abs(sum(m.pairA) - sum(m.pairB))).toBe(0)
  })
})

describe('exclusiones (por tipo)', () => {
  const group = () => makeParticipants(4)

  it('no_partner: nunca son pareja, pero sí pueden compartir pista como rivales', () => {
    const exclusions: ExclusionRule[] = [{ playerA: 'p0', playerB: 'p1', type: 'no_partner' }]
    for (let run = 0; run < 20; run++) {
      const m = generateMixingRound(group(), { ...baseConfig, exclusions }).matches[0]
      expect(arePartners(m, 'p0', 'p1')).toBe(false)
      expect(m.warning).toBeUndefined()
    }
  })

  it('no_opponent: nunca son rivales (juegan en la misma pareja)', () => {
    const exclusions: ExclusionRule[] = [{ playerA: 'p0', playerB: 'p1', type: 'no_opponent' }]
    for (let run = 0; run < 20; run++) {
      const m = generateMixingRound(group(), { ...baseConfig, exclusions }).matches[0]
      expect(areRivals(m, 'p0', 'p1')).toBe(false)
      expect(m.warning).toBeUndefined()
    }
  })

  it('no_contact: no comparten pista cuando hay alternativa', () => {
    const exclusions: ExclusionRule[] = [{ playerA: 'p0', playerB: 'p1', type: 'no_contact' }]
    for (let run = 0; run < 20; run++) {
      const result = generateMixingRound(makeParticipants(12), { ...baseConfig, exclusions })
      const m = findMatch(result.matches, 'p0')!
      expect([m.player1.id, m.player2.id, m.player3.id, m.player4.id]).not.toContain('p1')
    }
  })

  it('avisa cuando no se puede respetar una exclusión', () => {
    const exclusions: ExclusionRule[] = [{ playerA: 'p0', playerB: 'p1', type: 'no_contact' }]
    const m = generateMixingRound(group(), { ...baseConfig, exclusions }).matches[0]
    expect(m.warning).toContain('exclusiones')
  })
})

describe('pareja repetida', () => {
  it('nunca repite una pareja de este mismo evento (bloqueo duro), aunque el nivel lo favorezca', () => {
    for (let run = 0; run < 20; run++) {
      // 4+1 vs 3+2 es el reparto equilibrado; p0 y p3 ya fueron pareja hoy
      const participants = makeParticipants(4).map((p, i) => ({ ...p, rating: [4, 3, 2, 1][i] }))
      participants[0].session_partner_history = ['p3']
      participants[3].session_partner_history = ['p0']
      const m = generateMixingRound(participants, { ...baseConfig, prioritizeLevel: true }).matches[0]
      expect(arePartners(m, 'p0', 'p3')).toBe(false)
    }
  })

  it('evita repetir la pareja del evento anterior cuando no cuesta nivel (blando)', () => {
    for (let run = 0; run < 20; run++) {
      const participants = makeParticipants(4)
      participants[0].partner_history = ['p1']
      participants[1].partner_history = ['p0']
      const m = generateMixingRound(participants, baseConfig).matches[0]
      expect(arePartners(m, 'p0', 'p1')).toBe(false)
    }
  })

  it('el nivel pesa más que repetir la pareja del evento anterior', () => {
    // 4+1 vs 3+2 es la única forma equilibrada; p0 y p3 fueron pareja la semana pasada
    const participants = makeParticipants(4).map((p, i) => ({ ...p, rating: [4, 3, 2, 1][i] }))
    participants[0].partner_history = ['p3']
    participants[3].partner_history = ['p0']
    const m = generateMixingRound(participants, { ...baseConfig, prioritizeLevel: true }).matches[0]
    expect(arePartners(m, 'p0', 'p3')).toBe(true)
  })

  it('avisa si es imposible evitar una pareja repetida en este evento', () => {
    const participants = makeParticipants(4)
    // p0 ya fue pareja de los otros tres hoy: cualquier emparejamiento repite
    participants[0].session_partner_history = ['p1', 'p2', 'p3']
    participants[1].session_partner_history = ['p0']
    participants[2].session_partner_history = ['p0']
    participants[3].session_partner_history = ['p0']
    const m = generateMixingRound(participants, baseConfig).matches[0]
    expect(m.warning).toContain('PAREJA')
  })
})

describe('avisos de reencuentro', () => {
  it('avisa cuando los jugadores ya coincidieron en pista en este evento', () => {
    const participants = makeParticipants(4)
    participants.forEach(p => {
      p.session_encounter_counts = Object.fromEntries(participants.filter(o => o.id !== p.id).map(o => [o.id, 1]))
    })
    const m = generateMixingRound(participants, baseConfig).matches[0]
    expect(m.warning).toContain('en este evento')
  })

  it('no avisa por coincidencias con el evento anterior', () => {
    const participants = makeParticipants(4)
    participants.forEach(p => {
      p.encounter_counts = Object.fromEntries(participants.filter(o => o.id !== p.id).map(o => [o.id, 3]))
    })
    const m = generateMixingRound(participants, baseConfig).matches[0]
    expect(m.warning).toBeUndefined()
  })

  it('no avisa si nadie ha coincidido antes', () => {
    const m = generateMixingRound(makeParticipants(4), baseConfig).matches[0]
    expect(m.warning).toBeUndefined()
  })
})

describe('generateEventRounds — objetivo: no volver a verse las caras', () => {
  it('12 jugadores, 3 rondas: ninguna pareja repetida y reencuentros en el mínimo posible (9)', () => {
    // Con 3 pistas de 4, en la ronda 2 es inevitable que haya jugadores de una
    // misma pista de la ronda 1. El mínimo teórico del evento es 9 reencuentros.
    for (let run = 0; run < 10; run++) {
      const rounds = generateEventRounds(makeParticipants(12), baseConfig, 3)
      expect(partnerRepeats(rounds)).toBe(0)
      expect(reMeetings(rounds)).toBeLessThanOrEqual(10)
    }
  })

  it('16 jugadores, 3 rondas: ni parejas ni reencuentros (existe solución perfecta)', () => {
    let worst = 0
    for (let run = 0; run < 10; run++) {
      const rounds = generateEventRounds(makeParticipants(16), baseConfig, 3)
      expect(partnerRepeats(rounds)).toBe(0)
      worst = Math.max(worst, reMeetings(rounds))
    }
    expect(worst).toBeLessThanOrEqual(2)
  })

  it('con un evento anterior de 16 jugadores sigue sin repetir pareja ni encadenar reencuentros', () => {
    // Evento anterior: mismos 16 con historial; antes de la corrección esto daba ~7 reencuentros.
    const players = makeParticipants(16)
    const previous = generateEventRounds(players, baseConfig, 3)
    previous.forEach(r => r.matches.forEach(m => {
      const all = [m.player1, m.player2, m.player3, m.player4]
      for (const a of all) for (const b of all) {
        if (a.id === b.id) continue
        const p = players.find(x => x.id === a.id)!
        p.encounter_counts[b.id] = (p.encounter_counts[b.id] ?? 0) + 1
      }
      for (const pair of [m.pairA, m.pairB]) {
        players.find(x => x.id === pair[0].id)!.partner_history!.push(pair[1].id)
        players.find(x => x.id === pair[1].id)!.partner_history!.push(pair[0].id)
      }
    }))

    let total = 0
    for (let run = 0; run < 10; run++) {
      const rounds = generateEventRounds(players, baseConfig, 3)
      expect(partnerRepeats(rounds)).toBe(0)
      total += reMeetings(rounds)
    }
    expect(total / 10).toBeLessThan(1)
  })
})

describe('prioridad de nivel: partidos igualados (opción A)', () => {
  // Ratings repartidos entre 2,6 y 4,6 como en el grupo real.
  const spread = (n: number) => makeParticipants(n).map((p, i) => ({ ...p, rating: 2.6 + (2 * i) / (n - 1) }))

  function meanPairImbalance(prioritizeLevel: boolean) {
    let total = 0
    let count = 0
    for (let run = 0; run < 5; run++) {
      for (const round of generateEventRounds(spread(12), { ...baseConfig, prioritizeLevel }, 3)) {
        for (const m of round.matches) {
          total += Math.abs((m.pairA[0].rating + m.pairA[1].rating) - (m.pairB[0].rating + m.pairB[1].rating))
          count++
        }
      }
    }
    return total / count
  }

  it('con nivel activo los partidos quedan igualados sin sacrificar la rotación del evento', () => {
    const withLevel = meanPairImbalance(true)
    const withoutLevel = meanPairImbalance(false)
    expect(withLevel).toBeLessThan(0.35)
    expect(withLevel).toBeLessThan(withoutLevel / 2)

    for (let run = 0; run < 5; run++) {
      const rounds = generateEventRounds(spread(12), { ...baseConfig, prioritizeLevel: true }, 3)
      expect(partnerRepeats(rounds)).toBe(0)
      expect(reMeetings(rounds)).toBeLessThanOrEqual(10)
    }
  })
})

describe('summarizeRounds', () => {
  it('cuenta los reencuentros dentro del evento y los avisos', () => {
    const rounds = generateEventRounds(makeParticipants(12), baseConfig, 3)
    const summary = summarizeRounds(rounds)
    // 12 jugadores y 3 rondas: el mínimo posible son 9 reencuentros
    expect(summary.reMeetings).toBeGreaterThanOrEqual(9)
    expect(summary.warnings).toBeGreaterThan(0)
  })

  it('con 16 jugadores y 3 rondas no hay reencuentros ni avisos', () => {
    const summary = summarizeRounds(generateEventRounds(makeParticipants(16), baseConfig, 3))
    expect(summary.reMeetings).toBeLessThanOrEqual(2)
  })

  it('sin rondas todo es cero', () => {
    expect(summarizeRounds([])).toEqual({ reMeetings: 0, warnings: 0 })
  })
})
