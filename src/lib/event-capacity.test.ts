import { describe, it, expect } from 'vitest'
import { joinCopy } from './event-capacity'

const TOTAL = 12

describe('joinCopy: not signed up', () => {
  it('while starters are free: the plaza is guaranteed, with no mention of promotion', () => {
    const copy = joinCopy(TOTAL, 5, -1)
    expect(copy.shield).toBe('Tu plaza queda confirmada al apuntarte.')
    expect(copy.shield).not.toMatch(/titular/)
    expect(copy.note).toBe('La lista de espera se activa cuando se ocupen las 12 plazas.')
  })

  it('with a single plaza left it still shows the guarantee and the note', () => {
    const copy = joinCopy(TOTAL, TOTAL - 1, -1)
    expect(copy.shield).toBe('Tu plaza queda confirmada al apuntarte.')
    expect(copy.note).toBeDefined()
  })

  it('once the starters are full the waiting list starts: promotion notice, no note', () => {
    const copy = joinCopy(TOTAL, TOTAL, -1)
    expect(copy.shield).toBe('Entrarás en la lista de espera. Si hay una baja, te avisamos si subes a titular.')
    expect(copy.note).toBeUndefined()
  })

  it('with reserves already waiting it keeps the waiting-list copy', () => {
    const copy = joinCopy(TOTAL, TOTAL + 3, -1)
    expect(copy.shield).toMatch(/lista de espera/)
    expect(copy.note).toBeUndefined()
  })
})

describe('joinCopy: signed up', () => {
  it('a starter with nobody waiting just sees the plaza confirmed', () => {
    expect(joinCopy(TOTAL, 8, 3).shield).toBe('Tu plaza está confirmada.')
  })

  it('a starter with a waiting list is told who takes the plaza if they leave', () => {
    expect(joinCopy(TOTAL, TOTAL + 2, 11).shield).toBe(
      'Tu plaza está confirmada. Si te borras, la ocupará el primero de la lista de espera.'
    )
  })

  it('a reserve is told their place in the waiting list, not that the plaza is confirmed', () => {
    const copy = joinCopy(TOTAL, TOTAL + 3, TOTAL + 1)
    expect(copy.shield).toBe('Estás en la lista de espera (puesto 2). Si hay una baja, te avisamos si subes a titular.')
    expect(copy.shield).not.toMatch(/confirmada/)
    expect(copy.leaveDescription).toMatch(/lista de espera/)
  })

  it('the first reserve is place 1', () => {
    expect(joinCopy(TOTAL, TOTAL + 1, TOTAL).shield).toMatch(/puesto 1\)/)
  })
})
