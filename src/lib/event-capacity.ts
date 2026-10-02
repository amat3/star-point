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
  return reserveSpotsLeft(signedUp, maxSpots) > 0 ? 'Completo · apúntate en reserva' : 'Completo'
}
