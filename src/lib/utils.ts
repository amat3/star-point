import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const PLAYERS_PER_COURT = 4

export function formatPlayerName(p: { full_name?: string | null; is_guest?: boolean } | null | undefined) {
  const parts = (p?.full_name ?? '?').split(' ').slice(0, 2)
  const name = parts.map((n, i) => i === 1 && isNaN(Number(n)) ? n.charAt(0) + '.' : n).join(' ')
  return { name, isGuest: p?.is_guest ?? false }
}
