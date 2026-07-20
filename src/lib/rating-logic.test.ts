import { describe, it, expect } from 'vitest'
import { calculateNewRating, applyGuestProtection } from './rating-logic'
import { RATING_CONFIG } from './config'

describe('calculateNewRating', () => {
  it('sube el rating al ganar entre jugadores de nivel igual', () => {
    const result = calculateNewRating(3.5, 3.5, 3.5, 3.5, 6, 2, 'win', 20)
    expect(result.change).toBeGreaterThan(0)
    expect(result.newRating).toBeGreaterThan(3.5)
  })

  it('baja el rating al perder entre jugadores de nivel igual', () => {
    const result = calculateNewRating(3.5, 3.5, 3.5, 3.5, 2, 6, 'loss', 20)
    expect(result.change).toBeLessThan(0)
    expect(result.newRating).toBeLessThan(3.5)
  })

  it('el empate entre jugadores de nivel igual apenas mueve el rating', () => {
    const result = calculateNewRating(3.5, 3.5, 3.5, 3.5, 4, 4, 'draw', 20)
    expect(result.change).toBeCloseTo(0, 1)
  })

  it('no aplica cambio si la disparidad de nivel supera DISPARITY_ZERO', () => {
    const teamRating = 3.5
    const opponentsRating = teamRating + RATING_CONFIG.DISPARITY_ZERO + 1
    const result = calculateNewRating(teamRating, teamRating, opponentsRating, opponentsRating, 6, 0, 'win', 20)
    expect(result.change).toBe(0)
    expect(result.newRating).toBe(teamRating)
  })

  it('degrada linealmente el cambio para una disparidad intermedia', () => {
    const base = calculateNewRating(3.5, 3.5, 3.5, 3.5, 6, 0, 'win', 20)

    const midGap = (RATING_CONFIG.DISPARITY_FULL + RATING_CONFIG.DISPARITY_ZERO) / 2
    const degraded = calculateNewRating(3.5, 3.5, 3.5 - midGap, 3.5 - midGap, 6, 0, 'win', 20)

    expect(Math.abs(degraded.change)).toBeLessThan(Math.abs(base.change))
    expect(degraded.change).toBeGreaterThan(0)
  })

  it('un jugador provisional (pocos partidos) cambia más que uno establecido en el mismo escenario', () => {
    const provisional = calculateNewRating(3.5, 3.5, 3.5, 3.5, 6, 2, 'win', RATING_CONFIG.PROVISIONAL_LIMIT - 1)
    const established = calculateNewRating(3.5, 3.5, 3.5, 3.5, 6, 2, 'win', RATING_CONFIG.PROVISIONAL_LIMIT + 1)
    expect(Math.abs(provisional.change)).toBeGreaterThan(Math.abs(established.change))
  })

  it('la amortiguación reduce el cambio para ratings muy altos', () => {
    const low = calculateNewRating(3.5, 3.5, 3.5, 3.5, 6, 2, 'win', 20)
    const high = calculateNewRating(RATING_CONFIG.DAMPENING_END, RATING_CONFIG.DAMPENING_END, RATING_CONFIG.DAMPENING_END, RATING_CONFIG.DAMPENING_END, 6, 2, 'win', 20)
    expect(Math.abs(high.change)).toBeLessThan(Math.abs(low.change))
  })

  it('el resultado nunca supera MAX_RATING ni baja de MIN_RATING', () => {
    const atCeiling = calculateNewRating(RATING_CONFIG.MAX_RATING, RATING_CONFIG.MAX_RATING, 0.1, 0.1, 12, 0, 'win', 50)
    expect(atCeiling.newRating).toBeLessThanOrEqual(RATING_CONFIG.MAX_RATING)

    const atFloor = calculateNewRating(RATING_CONFIG.MIN_RATING, RATING_CONFIG.MIN_RATING, RATING_CONFIG.MAX_RATING, RATING_CONFIG.MAX_RATING, 0, 12, 'loss', 50)
    expect(atFloor.newRating).toBeGreaterThanOrEqual(RATING_CONFIG.MIN_RATING)
  })

  it('ganar por mucha diferencia de juegos cambia más el rating que ganar de forma ajustada', () => {
    const landslide = calculateNewRating(3.5, 3.5, 3.5, 3.5, 6, 0, 'win', 20)
    const narrow = calculateNewRating(3.5, 3.5, 3.5, 3.5, 4, 3, 'win', 20)
    expect(Math.abs(landslide.change)).toBeGreaterThan(Math.abs(narrow.change))
  })
})

describe('applyGuestProtection', () => {
  it('neutraliza una pérdida de un jugador real cuando hay un invitado en el partido', () => {
    const loss = calculateNewRating(3.5, 3.5, 3.5, 3.5, 2, 6, 'loss', 20)
    const protectedResult = applyGuestProtection(3.5, loss, true, false)
    expect(protectedResult.change).toBe(0)
    expect(protectedResult.newRating).toBe(3.5)
  })

  it('deja intacta una ganancia de un jugador real cuando hay un invitado en el partido', () => {
    const win = calculateNewRating(3.5, 3.5, 3.5, 3.5, 6, 2, 'win', 20)
    const protectedResult = applyGuestProtection(3.5, win, true, false)
    expect(protectedResult).toEqual(win)
  })

  it('no protege al propio invitado de perder rating', () => {
    const loss = calculateNewRating(3.5, 3.5, 3.5, 3.5, 2, 6, 'loss', 20)
    const protectedResult = applyGuestProtection(3.5, loss, true, true)
    expect(protectedResult).toEqual(loss)
  })

  it('no altera el resultado si no hay ningún invitado en el partido', () => {
    const loss = calculateNewRating(3.5, 3.5, 3.5, 3.5, 2, 6, 'loss', 20)
    const protectedResult = applyGuestProtection(3.5, loss, false, false)
    expect(protectedResult).toEqual(loss)
  })
})
