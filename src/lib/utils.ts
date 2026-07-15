import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const PLAYERS_PER_COURT = 4

export function toTitleCase(name: string | null | undefined) {
  return (name ?? '').toLowerCase().split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function truncateName(name: string | null | undefined, max = 12) {
  const s = toTitleCase(name)
  return s.length > max ? s.slice(0, max) + '...' : s
}

export function formatPlayerName(p: { full_name?: string | null; is_guest?: boolean; avatar_url?: string | null } | null | undefined) {
  return { name: truncateName(p?.full_name), isGuest: p?.is_guest ?? false, avatarUrl: p?.avatar_url ?? null }
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
 * Usa mediodía UTC de ese día como referencia para no toparse con la ambigüedad
 * del propio cambio de hora.
 */
function getMadridOffsetHoursForDate(referenceDate: Date): number {
  const noonUTC = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate(), 12, 0, 0))
  const madridAtNoon = new Date(noonUTC.toLocaleString('en-US', { timeZone: MADRID_TZ }))
  return Math.round((madridAtNoon.getTime() - noonUTC.getTime()) / 3_600_000)
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
