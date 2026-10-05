// "Partido": an event a player publishes to look for players. 4 players, 90 minutes,
// no draw and no results. max_spots = the organizer + the players still needed.

export const MATCH_TITLE = 'Partido'
export const MATCH_DURATION_MINUTES = 90
export const MATCH_MAX_NEEDED = 3
// Free comment of a match ("necesitamos una chica", "buscamos jugador de revés"…)
export const MATCH_NOTES_MAX = 140
export const MATCH_NOTE_SUGGESTIONS = ['Partido femenino', 'Partido mixto', 'Necesitamos una chica', 'Buscamos jugador de revés', 'Buscamos jugador de drive']

export const spotsForNeeded = (needed: number) => needed + 1
export const neededForSpots = (maxSpots: number) => Math.max(maxSpots - 1, 0)

/** A published match disappears once it has ended (start + 90 minutes). */
export function isMatchExpired(startTime: string, now = Date.now()) {
  return new Date(startTime).getTime() + MATCH_DURATION_MINUTES * 60_000 < now
}

/** "Busca 2 jugadores" style label for the players still missing. */
export const missingLabel = (missing: number) =>
  missing === 1 ? 'Falta 1 jugador' : `Faltan ${missing} jugadores`
