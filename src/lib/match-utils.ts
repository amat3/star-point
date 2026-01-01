/**
 * Utilidad para extraer el total de juegos de un string tipo "6-4 6-2" o "12-5"
 */
export function parseGames(score: string) {
  let gamesA = 0
  let gamesB = 0
  
  // Normalizamos espacios y separamos por bloques
  const sets = score.trim().split(/\s+/) // ["6-4", "6-2"] o ["12-5"]
  
  sets.forEach(set => {
    const [a, b] = set.split('-').map(Number)
    if (!isNaN(a) && !isNaN(b)) {
      gamesA += a
      gamesB += b
    }
  })
  
  return { gamesA, gamesB }
}
