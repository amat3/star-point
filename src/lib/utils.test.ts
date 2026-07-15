import { describe, it, expect } from 'vitest'
import { madridDateTimeToUTC, utcToMadridDateTime, toTitleCase } from './utils'

describe('madridDateTimeToUTC', () => {
  it('convierte 20:00 Madrid en verano (CEST, +2) a 18:00 UTC', () => {
    expect(madridDateTimeToUTC('2026-07-15', '20:00')).toBe('2026-07-15T18:00:00.000Z')
  })

  it('convierte 20:00 Madrid en invierno (CET, +1) a 19:00 UTC', () => {
    expect(madridDateTimeToUTC('2026-01-15', '20:00')).toBe('2026-01-15T19:00:00.000Z')
  })
})

describe('utcToMadridDateTime', () => {
  it('hace el round-trip correcto en verano', () => {
    expect(utcToMadridDateTime('2026-07-15T18:00:00.000Z')).toEqual({ date: '2026-07-15', time: '20:00' })
  })

  it('hace el round-trip correcto en invierno', () => {
    expect(utcToMadridDateTime('2026-01-15T19:00:00.000Z')).toEqual({ date: '2026-01-15', time: '20:00' })
  })

  it('caso real: el evento activo (18:00 UTC) debe mostrarse como 20:00 Madrid, no 22:00', () => {
    // Esta es la regresión detectada en producción el 2026-07-15: el diálogo de
    // edición mostraba/guardaba la hora usando la zona horaria del dispositivo
    // en vez de anclarla explícitamente a Europe/Madrid.
    const { time } = utcToMadridDateTime('2026-07-15T18:00:00.000Z')
    expect(time).toBe('20:00')
  })
})

describe('toTitleCase', () => {
  it('capitaliza cada palabra', () => {
    expect(toTitleCase('juan garcía')).toBe('Juan García')
  })

  it('devuelve cadena vacía para null/undefined', () => {
    expect(toTitleCase(null)).toBe('')
    expect(toTitleCase(undefined)).toBe('')
  })
})
