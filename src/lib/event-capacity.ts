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

// A published draw only becomes "En juego" when the event starts; before that
// the matches are just created.
export function drawAvailability(startTime: string, now: number = Date.now()): string {
  return new Date(startTime).getTime() <= now ? 'En juego' : 'Partidos creados'
}

// Availability line for an event the viewer is signed up for (position is 0-based).
// Starters already get the "Apuntado" pill on the card, so only how the event stands is
// said; a reserve also says its place in the waiting list.
export function joinedAvailability(position: number, signedUp: number, maxSpots: number): string {
  const free = maxSpots - signedUp
  const standing = free > 0 ? (free === 1 ? 'Queda 1 plaza' : `Quedan ${free} plazas`) : 'Completo'
  return position < maxSpots ? standing : `En reserva (${position - maxSpots + 1}) · ${standing}`
}
