// Mixing sign-up: `max_spots` starters plus a waiting list of up to MAX_RESERVES.
// (Published matches have no waiting list.)
export const MAX_RESERVES = 6

/** Waiting-list places still open for a mixing, given how many people are signed up. */
export function reserveSpotsLeft(signedUp: number, maxSpots: number) {
  const inWaitlist = Math.max(signedUp - maxSpots, 0)
  return Math.max(MAX_RESERVES - inWaitlist, 0)
}

/** Availability text for a mixing card that is not about the viewer's own status. */
export function mixingAvailability(signedUp: number, maxSpots: number) {
  const free = maxSpots - signedUp
  if (free > 0) return `${free} ${free === 1 ? 'plaza disponible' : 'plazas disponibles'}`
  const reserves = signedUp - maxSpots
  if (reserves > 0) return `Completo · ${reserves} en reserva`
  return reserveSpotsLeft(signedUp, maxSpots) > 0 ? 'Completo · apúntate en reserva' : 'Completo'
}

// A published draw is "Partidos creados" until the event starts, "En juego" while it is
// being played, and "Resultados pendientes" once its time is over but the event is still
// open (some match has no confirmed result yet).
export function drawAvailability(startTime: string, durationMinutes: number, now: number = Date.now()): string {
  if (isDrawCreated(startTime, now)) return 'Partidos creados'
  return isDrawFinished(startTime, durationMinutes, now) ? 'Resultados pendientes' : 'En juego'
}

/** True while a published draw has not started yet. */
export function isDrawCreated(startTime: string, now: number = Date.now()): boolean {
  return new Date(startTime).getTime() > now
}

/** True once the event's time is over (it stays in progress until every result is confirmed). */
export function isDrawFinished(startTime: string, durationMinutes: number, now: number = Date.now()): boolean {
  return new Date(startTime).getTime() + durationMinutes * 60_000 <= now
}

// Availability line for an event the viewer is signed up for (position is 0-based).
// Starters already get the "Apuntado" pill on the card, so only how the event stands is
// said; a reserve also says its place in the waiting list.
export function joinedAvailability(position: number, signedUp: number, maxSpots: number): string {
  const free = maxSpots - signedUp
  const standing = free > 0 ? (free === 1 ? 'Queda 1 plaza' : `Quedan ${free} plazas`) : 'Completo'
  return position < maxSpots ? standing : `En reserva (${position - maxSpots + 1}) · ${standing}`
}
