import { describe, expect, it } from 'vitest'
import {
  buildMatchParserPrompt,
  canUseMatchParser,
  normalizeName,
  normalizeParsedMatch,
  type ParsedMatch,
} from './match-parser'

const CLUBS = [
  { id: 'c1', name: 'Padel Indoor' },
  { id: 'c2', name: 'Club Pádel Atlántico' },
]
const TODAY = '2026-10-14' // Wednesday

const empty: ParsedMatch = { club: null, date: null, time: null, needed: null, notes: null, doubts: [] }

describe('normalizeParsedMatch', () => {
  it('fills every valid field', () => {
    const { fill, doubts } = normalizeParsedMatch(
      { club: 'Padel Indoor', date: '2026-10-15', time: '19:00', needed: 2, notes: 'Mejor un revés', doubts: [] },
      CLUBS,
      TODAY,
    )
    expect(fill).toEqual({ club_id: 'c1', date: '2026-10-15', time: '19:00', needed: 2, notes: 'Mejor un revés' })
    expect(doubts).toEqual([])
  })

  it('matches clubs ignoring case and accents', () => {
    const { fill } = normalizeParsedMatch({ ...empty, club: 'club padel  atlantico' }, CLUBS, TODAY)
    expect(fill.club_id).toBe('c2')
  })

  it('drops a club that does not exist and says so', () => {
    const { fill, doubts } = normalizeParsedMatch({ ...empty, club: 'Padel Norte' }, CLUBS, TODAY)
    expect(fill.club_id).toBeUndefined()
    expect(doubts[0]).toContain('Padel Norte')
  })

  it('rejects past and impossible dates', () => {
    expect(normalizeParsedMatch({ ...empty, date: '2026-10-13' }, CLUBS, TODAY).fill.date).toBeUndefined()
    expect(normalizeParsedMatch({ ...empty, date: '2026-02-30' }, CLUBS, TODAY).fill.date).toBeUndefined()
    expect(normalizeParsedMatch({ ...empty, date: 'jueves' }, CLUBS, TODAY).doubts).toHaveLength(1)
    expect(normalizeParsedMatch({ ...empty, date: TODAY }, CLUBS, TODAY).fill.date).toBe(TODAY)
  })

  it('pads the hour and rejects invalid times', () => {
    expect(normalizeParsedMatch({ ...empty, time: '9:30' }, CLUBS, TODAY).fill.time).toBe('09:30')
    expect(normalizeParsedMatch({ ...empty, time: '25:00' }, CLUBS, TODAY).fill.time).toBeUndefined()
  })

  it('only accepts 1 to 3 players', () => {
    expect(normalizeParsedMatch({ ...empty, needed: 3 }, CLUBS, TODAY).fill.needed).toBe(3)
    expect(normalizeParsedMatch({ ...empty, needed: 0 }, CLUBS, TODAY).fill.needed).toBeUndefined()
    expect(normalizeParsedMatch({ ...empty, needed: 4 }, CLUBS, TODAY).doubts).toHaveLength(1)
  })

  it('trims notes to the form limit and keeps the model doubts', () => {
    const { fill, doubts } = normalizeParsedMatch(
      { ...empty, notes: '  ' + 'a'.repeat(200), doubts: [' ¿Por la tarde a qué hora? ', ''] },
      CLUBS,
      TODAY,
    )
    expect(fill.notes).toHaveLength(140)
    expect(doubts).toEqual(['¿Por la tarde a qué hora?'])
  })
})

describe('buildMatchParserPrompt', () => {
  it('lists the clubs and a calendar starting today', () => {
    const prompt = buildMatchParserPrompt(CLUBS, TODAY)
    expect(prompt).toContain('- Padel Indoor')
    expect(prompt).toContain('- miércoles 2026-10-14 (hoy)')
    expect(prompt).toContain('- jueves 2026-10-15 (mañana)')
    expect(prompt).toContain('- domingo 2026-10-18')
  })

  it('crosses month ends', () => {
    expect(buildMatchParserPrompt(CLUBS, '2026-10-30')).toContain('- domingo 2026-11-01')
  })
})

describe('helpers', () => {
  it('normalizes names', () => {
    expect(normalizeName('  Club  PÁDEL ')).toBe('club padel')
  })

  it('lets admins and enabled players in', () => {
    expect(canUseMatchParser({ role: 'admin', ai_enabled: false })).toBe(true)
    expect(canUseMatchParser({ role: 'player', ai_enabled: true })).toBe(true)
    expect(canUseMatchParser({ role: 'player', ai_enabled: false })).toBe(false)
    expect(canUseMatchParser(null)).toBe(false)
  })
})
