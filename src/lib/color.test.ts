import { describe, expect, it } from 'vitest'
import { mix, withAlpha } from './color'

describe('mix', () => {
  it('mezcla como color-mix en srgb', () => {
    expect(mix('#000000', '#ffffff', 50)).toBe('#808080')
    expect(mix('#123d32', '#ffffff', 0)).toBe('#123d32')
    expect(mix('#123d32', '#000000', 100)).toBe('#000000')
  })

  it('acepta colores de tres cifras', () => {
    expect(mix('#fff', '#000', 50)).toBe('#808080')
  })
})

describe('withAlpha', () => {
  it('convierte a rgba', () => {
    expect(withAlpha('#123d32', 0.5)).toBe('rgba(18, 61, 50, 0.5)')
  })
})
