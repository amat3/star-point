import { describe, it, expect } from 'vitest'
import { pairFormatLabel, ruleProblems, rulesToConfig, type DrawRule } from './draw-rules'
import type { MixingParticipant } from './mixing-algorithm'

// 3 women (A, B, C) and 5 men (D–H): two courts. A separated round has one women's court of 3 + 1 man.
function player(id: string, gender: MixingParticipant['gender']): MixingParticipant {
  return {
    id,
    rating: 3.5,
    gender,
    court_position: 'ambos',
    full_name: id,
    encounter_counts: {},
    session_encounter_counts: {},
    partner_history: [],
    session_partner_history: [],
  }
}

const starters = [
  ...['A', 'B', 'C'].map(id => player(id, 'femenino')),
  ...['D', 'E', 'F', 'G', 'H'].map(id => player(id, 'masculino')),
]

let next = 0
const pair = (a: string, b: string): DrawRule => ({ id: `r${next++}`, kind: 'pair', playerA: a, playerB: b, playerAName: a, playerBName: b })
const courtMan = (a: string): DrawRule => ({ id: `r${next++}`, kind: 'women_court', playerA: a, playerB: null, playerAName: a, playerBName: null })

describe('ruleProblems', () => {
  it('sin problemas cuando todo encaja', () => {
    expect(ruleProblems(starters, ['separated', 'mixed'], [pair('A', 'D'), pair('B', 'C'), pair('E', 'F'), courtMan('G')])).toEqual([])
  })

  it('una regla con alguien que no es titular', () => {
    const outsider = { ...pair('A', 'Z'), playerBName: 'Zeta' }
    expect(ruleProblems(starters, ['mixed'], [outsider])).toContain('Zeta tiene una regla pero no es titular de este evento.')
  })

  it('una pareja sin rondas de su formato', () => {
    expect(ruleProblems(starters, ['open', 'separated'], [pair('A', 'D')])).toContain(
      'A + D tienen que jugar juntos en una ronda mixta y no hay ninguna.'
    )
  })

  it('más parejas fijas de un formato que rondas de ese formato', () => {
    expect(ruleProblems(starters, ['mixed', 'separated'], [pair('A', 'D'), pair('A', 'E')])).toContain(
      'A tiene 2 parejas fijas para rondas mixtas y solo hay 1.'
    )
  })

  it('una pareja fija que una exclusión separa', () => {
    expect(
      ruleProblems(starters, ['mixed'], [pair('A', 'D')], [{ playerA: 'D', playerB: 'A', type: 'no_partner' }])
    ).toContain('A + D tienen una exclusión que les impide ser pareja.')
  })

  it('no hay chicos permitidos libres para la pista de chicas en todas las rondas separadas', () => {
    // D is the only one allowed, and plays his men's pair in one of the two separated rounds
    const problems = ruleProblems(starters, ['separated', 'separated'], [courtMan('D'), pair('D', 'E')])
    expect(problems).toContain(
      'La pista de chicas necesita 1 chico en cada ronda separada (2 en total), pero los chicos de la lista solo pueden cubrir 1: ' +
        'el resto de esas rondas juegan sus parejas fijas masculinas.'
    )
  })

  it('faltan chicos en la lista para la pista de chicas', () => {
    // 2 women: their court needs 2 men in every separated round
    const twoWomen = starters.filter(p => p.id !== 'C').concat(player('I', 'masculino'))
    expect(ruleProblems(twoWomen, ['separated'], [courtMan('D')])).toContain(
      'La pista de chicas necesita 2 chicos en cada ronda separada y en la lista solo hay 1.'
    )
  })

  it('una chica en la lista de la pista de chicas', () => {
    expect(ruleProblems(starters, ['separated'], [courtMan('A')])).toContain('A está en la lista de la pista de chicas, pero es chica.')
  })

  it('deja para después las reglas de jugadores sin género', () => {
    const withUnknown = starters.map(p => (p.id === 'D' ? { ...p, gender: 'otro' as const } : p))
    expect(ruleProblems(withUnknown, ['open'], [pair('A', 'D')])).toEqual([])
  })
})

describe('rulesToConfig y pairFormatLabel', () => {
  it('separa parejas fijas y chicos de la pista de chicas', () => {
    expect(rulesToConfig([pair('A', 'D'), courtMan('E')])).toEqual({ fixedPairs: [['A', 'D']], womenCourtMen: ['E'] })
  })

  it('nombra el formato de una pareja', () => {
    const [a, b, , d, e] = starters
    expect(pairFormatLabel(a, d)).toBe('Mixta')
    expect(pairFormatLabel(a, b)).toBe('Femenina')
    expect(pairFormatLabel(d, e)).toBe('Masculina')
    expect(pairFormatLabel(a, { ...d, gender: 'otro' })).toBeNull()
  })
})
