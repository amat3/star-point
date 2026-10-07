import { describe, it, expect } from 'vitest'
import { madridDateTimeToUTC, utcToMadridDateTime, toTitleCase, firstName, roundStartsAt, roundEndsAt } from './utils'

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

describe('roundStartsAt', () => {
  const start = '2026-10-14T18:00:00.000Z'

  it('la ronda 1 empieza con el evento', () => {
    expect(roundStartsAt(start, 90, 3, 1).toISOString()).toBe(start)
  })

  it('reparte la duración a partes iguales: 90 min y 3 rondas, una cada 30 min', () => {
    expect(roundStartsAt(start, 90, 3, 2).toISOString()).toBe('2026-10-14T18:30:00.000Z')
    expect(roundStartsAt(start, 90, 3, 3).toISOString()).toBe('2026-10-14T19:00:00.000Z')
  })

  it('sin datos usa 90 min y una ronda', () => {
    expect(roundStartsAt(start, null, null, null).toISOString()).toBe(start)
  })
})

describe('roundEndsAt', () => {
  const start = '2026-10-14T18:00:00.000Z'

  it('cada ronda acaba cuando empieza la siguiente', () => {
    expect(roundEndsAt(start, 90, 3, 1).toISOString()).toBe('2026-10-14T18:30:00.000Z')
    expect(roundEndsAt(start, 90, 3, 2).toISOString()).toBe('2026-10-14T19:00:00.000Z')
  })

  it('la última ronda acaba cuando acaba el evento', () => {
    expect(roundEndsAt(start, 90, 3, 3).toISOString()).toBe('2026-10-14T19:30:00.000Z')
  })
})

describe('firstName', () => {
  it('returns the first word of a normal name', () => {
    expect(firstName('juanan amate')).toBe('Juanan')
    expect(firstName('Luis Ortega')).toBe('Luis')
  })

  it('keeps the next word when the first one is only an initial', () => {
    expect(firstName('M Dolores Vega')).toBe('M Dolores')
    expect(firstName('m. rosa')).toBe('M. Rosa')
  })

  it('handles single words and empty values', () => {
    expect(firstName('Lola')).toBe('Lola')
    expect(firstName('M')).toBe('M')
    expect(firstName('')).toBe('')
    expect(firstName(null)).toBe('')
  })
})
