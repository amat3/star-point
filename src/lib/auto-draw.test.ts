import { describe, it, expect } from 'vitest'
import {
  CRON_INTERVAL_MS,
  DRAW_ATTEMPTS,
  DRAW_LEAD_MS,
  isDrawDue,
  isFirstDrawWindow,
  pickBestDraw,
} from './auto-draw'
import type { MatchProposal, MixingParticipant, RoundProposal } from './mixing-algorithm'

// A Wednesday at 20:00 Madrid (CEST, UTC+2) → 18:00 UTC
const START = '2026-10-14T18:00:00.000Z'
const start = new Date(START).getTime()
const minutes = (n: number) => n * 60_000

describe('isDrawDue', () => {
  it('is not due earlier than 3 hours before the start', () => {
    expect(isDrawDue(START, start - DRAW_LEAD_MS - 1)).toBe(false)
    expect(isDrawDue(START, start - minutes(240))).toBe(false)
  })

  it('is due from exactly 3 hours before (17:00 Madrid)', () => {
    expect(isDrawDue(START, start - DRAW_LEAD_MS)).toBe(true)
    expect(isDrawDue(START, start - minutes(90))).toBe(true)
  })

  it('is no longer due once the event has started', () => {
    expect(isDrawDue(START, start - 1)).toBe(true)
    expect(isDrawDue(START, start)).toBe(false)
    expect(isDrawDue(START, start + minutes(30))).toBe(false)
  })
})

describe('isFirstDrawWindow', () => {
  it('covers only the first cron interval after the mark', () => {
    expect(isFirstDrawWindow(START, start - DRAW_LEAD_MS - 1)).toBe(false)
    expect(isFirstDrawWindow(START, start - DRAW_LEAD_MS)).toBe(true)
    expect(isFirstDrawWindow(START, start - DRAW_LEAD_MS + CRON_INTERVAL_MS - 1)).toBe(true)
    expect(isFirstDrawWindow(START, start - DRAW_LEAD_MS + CRON_INTERVAL_MS)).toBe(false)
  })

  it('a 15-minute cron lands in it exactly once, whatever its offset', () => {
    for (const offsetMs of [0, 1_000, 59_000, minutes(7), minutes(14) + 59_000]) {
      const runs = Array.from({ length: 12 }, (_, i) => start - minutes(240) + offsetMs + i * CRON_INTERVAL_MS)
      expect(runs.filter(now => isFirstDrawWindow(START, now))).toHaveLength(1)
    }
  })
})

describe('pickBestDraw', () => {
  const player = (id: string): MixingParticipant => ({
    id, rating: 3, gender: 'otro', court_position: 'ambos', full_name: id, encounter_counts: {},
  })
  const [a, b, c, d] = ['a', 'b', 'c', 'd'].map(player)
  const match = (warning?: string): MatchProposal => ({
    courtNumber: 1, player1: a, player2: b, player3: c, player4: d, pairA: [a, b], pairB: [c, d], warning,
  })
  // reMeetings = how many times a pair meets again: the same court in two rounds
  const draw = (rounds: number, warning?: string): RoundProposal[] =>
    Array.from({ length: rounds }, () => ({ matches: [match(warning)], leftovers: [] }))

  it('keeps the draw with fewer warnings, even with more repeated meetings', () => {
    const attempts = [draw(3, 'aviso'), draw(3), draw(1, 'aviso')]
    let i = 0
    const best = pickBestDraw(() => attempts[i++], attempts.length)
    expect(best.warnings).toBe(0)
    expect(best.reMeetings).toBe(12) // 3 rounds on the same court: 6 pairs × 2 repeats
  })

  it('with equal warnings keeps the one with fewer repeated meetings', () => {
    const attempts = [draw(3), draw(2), draw(1)]
    let i = 0
    expect(pickBestDraw(() => attempts[i++], attempts.length).reMeetings).toBe(0)
  })

  it('stops as soon as it finds a perfect draw', () => {
    let calls = 0
    pickBestDraw(() => { calls++; return draw(1) }, DRAW_ATTEMPTS)
    expect(calls).toBe(1)
  })

  it('tries the full number of attempts when no draw is perfect', () => {
    let calls = 0
    pickBestDraw(() => { calls++; return draw(2) }, DRAW_ATTEMPTS)
    expect(calls).toBe(DRAW_ATTEMPTS)
  })
})
