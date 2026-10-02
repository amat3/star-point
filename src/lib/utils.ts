export const PLAYERS_PER_COURT = 4

export function toTitleCase(name: string | null | undefined) {
  return (name ?? '').toLowerCase().split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function isStandaloneMode() {
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

export function isIOSDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

export function isTouchDevice() {
  return window.matchMedia('(pointer: coarse)').matches
}

const MADRID_TZ = 'Europe/Madrid'

/**
 * Offset de Madrid respecto a UTC (en horas, +1 CET o +2 CEST) para una fecha dada.
 * Lee el offset directamente vía Intl (`shortOffset`) en vez de reinterpretar un
 * string formateado como si fuera hora local del runtime — ese truco alternativo
 * da resultados incorrectos (offset 0) precisamente cuando el propio runtime ya
 * está en zona horaria Europe/Madrid, que es el caso más común para esta app.
 */
function getMadridOffsetHoursForDate(referenceDate: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MADRID_TZ,
    timeZoneName: 'shortOffset',
  }).formatToParts(referenceDate)
  const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+0'
  const match = tzPart.match(/GMT([+-]\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

/**
 * Convierte una fecha+hora en horario local de Madrid (YYYY-MM-DD, HH:MM) al
 * ISO string UTC correspondiente, con independencia de la zona horaria del
 * dispositivo/navegador donde se ejecute.
 */
export function madridDateTimeToUTC(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = timeStr.split(':').map(Number)
  const approxDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  const offsetHours = getMadridOffsetHoursForDate(approxDate)
  return new Date(Date.UTC(year, month - 1, day, hour - offsetHours, minute, 0)).toISOString()
}

/**
 * Convierte un ISO string UTC a sus componentes de fecha/hora tal como se
 * verían en Madrid, con independencia de la zona horaria del
 * dispositivo/navegador donde se ejecute.
 */
export function utcToMadridDateTime(isoString: string): { date: string, time: string } {
  const dt = new Date(isoString)
  const date = new Intl.DateTimeFormat('sv', { timeZone: MADRID_TZ }).format(dt)
  const time = new Intl.DateTimeFormat('es-ES', { timeZone: MADRID_TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(dt)
  return { date, time }
}

/** Fecha larga en español para el saludo, p. ej. "viernes, 2 de octubre" (hora de Madrid). */
export function formatTodayLong(now = new Date()) {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Madrid',
  }).format(now)
}

/** "Viernes, 2 de octubre" (hora de Madrid). */
export function formatEventDate(dateStr: string) {
  const date = new Date(dateStr).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' })
  return date.charAt(0).toUpperCase() + date.slice(1)
}

/** "18:30" (hora de Madrid). */
export function formatEventTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' })
}

/** Día del mes en hora de Madrid, con dos dígitos: "02". */
export function formatEventDay(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', timeZone: 'Europe/Madrid' })
}

/** Mes abreviado en hora de Madrid: "oct". */
export function formatEventMonth(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', { month: 'short', timeZone: 'Europe/Madrid' }).replace('.', '')
}

/** "Hoy", "Ayer", "Hace 3 días" o "12 sep" (por día natural en Madrid). */
export function formatRelativeDay(dateStr: string, now = new Date()) {
  const toDay = (d: Date) =>
    new Date(d.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })).getTime()
  const days = Math.round((toDay(now) - toDay(new Date(dateStr))) / 86_400_000)
  if (days <= 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} días`
  return new Date(dateStr)
    .toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'Europe/Madrid' })
    .replace('.', '')
}

/** Nivel mostrado al usuario a partir del rating: 3.24 → "3,2". */
export function formatLevel(rating: number | null | undefined) {
  return (rating ?? 0).toFixed(1).replace('.', ',')
}

/**
 * Juegos totales de cada lado de un marcador ("8-5" o, en datos antiguos, "6-4 6-2"),
 * desde el punto de vista del equipo indicado (A si `inTeamA`, B si no).
 * Solo cuentan juegos, no sets.
 */
export function totalGames(scoreDetails: string | null | undefined, inTeamA: boolean) {
  let mine = 0
  let theirs = 0
  for (const part of (scoreDetails ?? '').split(' ')) {
    const [a, b] = part.split('-').map(Number)
    if (isNaN(a) || isNaN(b)) continue
    mine += inTeamA ? a : b
    theirs += inTeamA ? b : a
  }
  return { mine, theirs }
}

/** Día de la semana en singular, p. ej. "miércoles" (hora de Madrid). */
export function formatEventWeekday(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', { weekday: 'long', timeZone: 'Europe/Madrid' })
}

/** Chip de fecha y hora: "7 OCT · 20:00". */
export function formatEventChip(dateStr: string) {
  return `${Number(formatEventDay(dateStr))} ${formatEventMonth(dateStr).toUpperCase()} · ${formatEventTime(dateStr)}`
}

/**
 * Hora estimada de inicio de una ronda: el evento reparte su duración a partes
 * iguales entre sus rondas (90 min y 3 rondas → una cada 30 min).
 */
export function roundStartsAt(
  eventStart: string,
  durationMinutes: number | null | undefined,
  rounds: number | null | undefined,
  roundNumber: number | null | undefined
): Date {
  const slotMs = ((durationMinutes || 90) / (rounds || 1)) * 60_000
  return new Date(new Date(eventStart).getTime() + ((roundNumber || 1) - 1) * slotMs)
}

/** Hora estimada de fin de una ronda: el inicio de la siguiente (la última acaba con el evento). */
export function roundEndsAt(
  eventStart: string,
  durationMinutes: number | null | undefined,
  rounds: number | null | undefined,
  roundNumber: number | null | undefined
): Date {
  return roundStartsAt(eventStart, durationMinutes, rounds, (roundNumber || 1) + 1)
}

/** Día de la semana en plural para "El plan de los miércoles" (hora de Madrid). */
export function formatWeekdayPlural(dateStr: string) {
  const day = new Date(dateStr).toLocaleDateString('es-ES', { weekday: 'long', timeZone: 'Europe/Madrid' })
  return day.endsWith('s') ? day : `${day}s`
}
