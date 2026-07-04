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

export function formatPlayerName(p: { full_name?: string | null; is_guest?: boolean } | null | undefined) {
  return { name: truncateName(p?.full_name), isGuest: p?.is_guest ?? false }
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
