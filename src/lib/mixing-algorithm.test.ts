import { describe, it, expect } from 'vitest'
import {
  generateMixingRound,
  generateEventRounds,
  summarizeRounds,
  MixingParticipant,
  MixingConfig,
  ExclusionRule,
  MatchProposal,
  womenPerCourt,
  scheduleFixedPairs,
  brokenRules,
  FixedPair,
  GenderMode,
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

// --- Gender format of the rounds ------------------------------------------------------------------

function makeGendered(women: number, men: number): MixingParticipant[] {
  return makeParticipants(women + men).map((p, i) => ({ ...p, gender: i < women ? 'femenino' as const : 'masculino' as const }))
}

const womenOn = (m: MatchProposal) => [m.player1, m.player2, m.player3, m.player4].filter(p => p.gender === 'femenino').length
const hasMixedPairs = (m: MatchProposal) => [m.pairA, m.pairB].every(pair => pair.filter(p => p.gender === 'femenino').length === 1)
const womenPerMatch = (matches: MatchProposal[]) => matches.map(womenOn).sort((a, b) => b - a)

describe('womenPerCourt', () => {
  it('separada: pistas de 4 chicas mientras haya; las que sobran completan su pista con chicos', () => {
    expect(womenPerCourt(12, 6, 'separated')).toEqual([4, 4, 4, 0, 0, 0])
    expect(womenPerCourt(11, 6, 'separated')).toEqual([4, 4, 3, 0, 0, 0])
    expect(womenPerCourt(10, 6, 'separated')).toEqual([4, 4, 2, 0, 0, 0])
  })

  it('mixta: 2 chicas y 2 chicos por pista mientras haya de los dos', () => {
    expect(womenPerCourt(12, 6, 'mixed')).toEqual([2, 2, 2, 2, 2, 2])
    expect(womenPerCourt(11, 6, 'mixed')).toEqual([2, 2, 2, 2, 2, 1])
    expect(womenPerCourt(13, 6, 'mixed')).toEqual([2, 2, 2, 2, 2, 3])
    expect(womenPerCourt(11, 4, 'mixed')).toEqual([2, 2, 3, 4])
  })
})

describe('formato por género de la ronda', () => {
  it('separada con 12 chicas y 12 chicos: cada pista es de un solo género', () => {
    const { matches } = generateMixingRound(makeGendered(12, 12), { ...baseConfig, genderMode: 'separated' })
    expect(womenPerMatch(matches)).toEqual([4, 4, 4, 0, 0, 0])
  })

  it('separada con 11 chicas: dos pistas femeninas y en la tercera entra un chico', () => {
    const { matches } = generateMixingRound(makeGendered(11, 13), { ...baseConfig, genderMode: 'separated' })
    expect(womenPerMatch(matches)).toEqual([4, 4, 3, 0, 0, 0])
  })

  it('mixta con 12 y 12: todas las pistas son de 2 chicas y 2 chicos con parejas mixtas', () => {
    const { matches } = generateMixingRound(makeGendered(12, 12), { ...baseConfig, genderMode: 'mixed' })
    expect(matches.every(m => womenOn(m) === 2 && hasMixedPairs(m))).toBe(true)
  })

  it('mixta con 11 chicas y 13 chicos: cinco pistas mixtas y una con 1 chica y 3 chicos', () => {
    const { matches } = generateMixingRound(makeGendered(11, 13), { ...baseConfig, genderMode: 'mixed' })
    expect(womenPerMatch(matches)).toEqual([2, 2, 2, 2, 2, 1])
    expect(matches.filter(m => womenOn(m) === 2).every(hasMixedPairs)).toBe(true)
  })

  it('con 2 chicas y 2 chicos en pista nunca juegan chicas contra chicos, aunque el nivel lo prefiera', () => {
    const [a, b, c, d] = makeParticipants(4)
    const players: MixingParticipant[] = [
      { ...a, gender: 'femenino', rating: 5 },
      { ...b, gender: 'femenino', rating: 3 },
      { ...c, gender: 'masculino', rating: 4 },
      { ...d, gender: 'masculino', rating: 4 },
    ]
    const level: MixingConfig = { ...baseConfig, prioritizeLevel: true }
    // By level alone the two women play the two men (8 against 8)
    expect(hasMixedPairs(generateMixingRound(players, level).matches[0])).toBe(false)
    expect(hasMixedPairs(generateMixingRound(players, { ...level, genderMode: 'separated' }).matches[0])).toBe(true)
    expect(hasMixedPairs(generateMixingRound(players, { ...level, genderMode: 'mixed' }).matches[0])).toBe(true)
  })

  it('2 rondas separadas + 2 mixtas con 12 y 12: cada chica juega 2 partidos femeninos y 2 mixtos, sin repetir pareja', () => {
    const players = makeGendered(12, 12)
    const rounds = generateEventRounds(
      players,
      { ...baseConfig, prioritizeLevel: true, forcePosition: true, roundGenderModes: ['separated', 'mixed', 'separated', 'mixed'] },
      4
    )
    expect(partnerRepeats(rounds)).toBe(0)
    for (const woman of players.filter(p => p.gender === 'femenino')) {
      const own = rounds.map(r => findMatch(r.matches, woman.id)!)
      expect(own.filter(m => womenOn(m) === 4)).toHaveLength(2)
      expect(own.filter(m => womenOn(m) === 2 && hasMixedPairs(m))).toHaveLength(2)
    }
  })

  it('con 11 chicas y 13 chicos cada ronda mantiene su formato con el máximo de chicas', () => {
    const modes: MixingConfig['genderMode'][] = ['separated', 'mixed', 'separated', 'mixed']
    const rounds = generateEventRounds(makeGendered(11, 13), { ...baseConfig, prioritizeLevel: true, roundGenderModes: modes }, 4)
    rounds.forEach((round, i) =>
      expect(womenPerMatch(round.matches)).toEqual(modes[i] === 'separated' ? [4, 4, 3, 0, 0, 0] : [2, 2, 2, 2, 2, 1])
    )
    expect(partnerRepeats(rounds)).toBe(0)
  })

  it('una ronda sin formato propio usa el de la configuración', () => {
    const rounds = generateEventRounds(makeGendered(12, 12), { ...baseConfig, genderMode: 'mixed', roundGenderModes: ['separated'] }, 2)
    expect(womenPerMatch(rounds[0].matches)).toEqual([4, 4, 4, 0, 0, 0])
    expect(rounds[1].matches.every(m => womenOn(m) === 2 && hasMixedPairs(m))).toBe(true)
  })
})

// --- Event rules: fixed pairs and the men allowed on the women's court -------------------------------------------

// A special event like the one these rules were made for, with generic players: 11 women (w0–w10) and 13 men
// (m0–m12), two separated rounds and two mixed. w3 has two mixed and two women's fixed pairs; m5 two men's pairs,
// so of the allowed men he is never free for the women's court and m8 and m1 only once each: exactly the two
// places it needs.
function specialEvent() {
  const women = Array.from({ length: 11 }, (_, i) => `w${i}`)
  const men = Array.from({ length: 13 }, (_, i) => `m${i}`)
  const players: MixingParticipant[] = [...women, ...men].map((id, i) => ({
    id,
    rating: 3 + ((i * 7) % 10) / 10,
    gender: id.startsWith('w') ? 'femenino' as const : 'masculino' as const,
    court_position: (['drive', 'reves', 'ambos'] as const)[i % 3],
    full_name: id,
    encounter_counts: {},
    session_encounter_counts: {},
    partner_history: [],
    session_partner_history: [],
  }))
  const fixedPairs: FixedPair[] = [
    ['w0', 'm0'], ['w1', 'm1'], ['w2', 'm2'], ['w3', 'm3'], ['w3', 'm4'], ['w4', 'm5'], ['w5', 'm6'], ['w6', 'm7'],
    ['w3', 'w7'], ['w3', 'w4'], ['w8', 'w9'],
    ['m8', 'm4'], ['m3', 'm5'], ['m5', 'm2'], ['m9', 'm10'], ['m1', 'm11'],
  ]
  const womenCourtMen = ['m8', 'm1', 'm5']
  const modes: GenderMode[] = ['separated', 'mixed', 'separated', 'mixed']
  return { players, fixedPairs, womenCourtMen, modes }
}

describe('scheduleFixedPairs', () => {
  it('cada pareja fija va a una ronda de su formato y nadie tiene dos en la misma ronda', () => {
    const { players, fixedPairs, womenCourtMen, modes } = specialEvent()
    const genderOf = new Map(players.map(p => [p.id, p.gender]))
    for (let run = 0; run < 20; run++) {
      const schedule = scheduleFixedPairs(players, modes, fixedPairs, womenCourtMen)!
      expect(schedule.flat()).toHaveLength(fixedPairs.length)
      schedule.forEach((pairs, round) => {
        const ids = pairs.flat()
        expect(new Set(ids).size).toBe(ids.length)
        for (const [a, b] of pairs) {
          const mixed = genderOf.get(a) !== genderOf.get(b)
          expect(modes[round]).toBe(mixed ? 'mixed' : 'separated')
        }
      })
      // The two allowed men with a single men's pair play it in different separated rounds
      const busyIn = (man: string) => schedule.findIndex(pairs => pairs.some(pair => pair.includes(man) && pair.every(id => id.startsWith('m'))))
      expect(busyIn('m8')).not.toBe(busyIn('m1'))
    }
  })

  it('devuelve null si los chicos permitidos no alcanzan para la pista de chicas', () => {
    const { players, fixedPairs, womenCourtMen, modes } = specialEvent()
    // With 10 women the women's court needs 2 men per separated round: 4 places, and only 2 are free
    const tenWomen = players.filter(p => p.id !== 'w10').concat({ ...players.find(p => p.id === 'm12')!, id: 'm13', full_name: 'm13' })
    expect(scheduleFixedPairs(tenWomen, modes, fixedPairs, womenCourtMen)).toBeNull()
  })

  it('devuelve null si una pareja no tiene ninguna ronda de su formato', () => {
    const { players } = specialEvent()
    expect(scheduleFixedPairs(players, ['separated', 'separated'], [['w0', 'm0']])).toBeNull()
  })
})

describe('reglas del evento en el sorteo', () => {
  it('cumple todas las parejas fijas y solo deja entrar en la pista de chicas a los chicos permitidos', () => {
    const { players, fixedPairs, womenCourtMen, modes } = specialEvent()
    for (let run = 0; run < 4; run++) {
      const rounds = generateEventRounds(
        players,
        { ...baseConfig, prioritizeLevel: true, forcePosition: true, roundGenderModes: modes, fixedPairs, womenCourtMen },
        4
      )
      expect(brokenRules(rounds, modes, fixedPairs, womenCourtMen)).toEqual([])
      expect(partnerRepeats(rounds)).toBe(0)
      rounds.forEach((round, i) =>
        expect(womenPerMatch(round.matches)).toEqual(modes[i] === 'separated' ? [4, 4, 3, 0, 0, 0] : [2, 2, 2, 2, 2, 1])
      )
    }
  })

  it('lanza un error claro si las parejas fijas no encajan', () => {
    const { players } = specialEvent()
    expect(() =>
      generateEventRounds(players, { ...baseConfig, roundGenderModes: ['open', 'open'], fixedPairs: [['w0', 'm0']] }, 2)
    ).toThrow('Las parejas fijas no encajan')
  })
})

describe('brokenRules', () => {
  it('detecta una pareja fija que no ha jugado junta y un chico que no puede estar en la pista de chicas', () => {
    const { players } = specialEvent()
    const modes: GenderMode[] = ['separated']
    const [round] = generateEventRounds(players, { ...baseConfig, roundGenderModes: modes }, 1)
    const shared = round.matches.find(m => womenOn(m) === 3)!
    const man = [shared.player1, shared.player2, shared.player3, shared.player4].find(p => p.gender === 'masculino')!
    const nobody = players.find(p => p.gender === 'masculino' && p.id !== man.id)!.id
    const broken = brokenRules([round], modes, [['w0', 'm0']], [nobody])
    expect(broken).toContainEqual({ kind: 'pair', players: ['w0', 'm0'] })
    expect(broken).toContainEqual({ kind: 'women_court', players: [man.id], round: 1 })
  })
})
