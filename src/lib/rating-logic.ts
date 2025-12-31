// lib/rating-logic.ts

export interface RatingResult {
  newRating: number;
  change: number;
}

/**
 * Calcula el cambio de nivel tras un partido considerando el margen de victoria
 * @param playerRating Nivel actual del jugador
 * @param partnerRating Nivel de su pareja
 * @param opp1Rating Nivel oponente 1
 * @param opp2Rating Nivel oponente 2
 * @param gamesWon Juegos totales ganados por el equipo del jugador
 * @param gamesLost Juegos totales perdidos por el equipo del jugador
 * @param didWin true si el jugador ganó
 */
export function calculateNewRating(
  playerRating: number,
  partnerRating: number,
  opp1Rating: number,
  opp2Rating: number,
  gamesWon: number,
  gamesLost: number,
  didWin: boolean
): RatingResult {
  const K = 0.15; // Sensibilidad base
  const SCALE_DIVISOR = 3;

  // 1. Calcular la "Contundencia" (Dominance Factor)
  // Calculamos qué porcentaje de los juegos totales ganó el equipo
  const totalGames = gamesWon + gamesLost;
  const gameRatio = totalGames > 0 ? gamesWon / totalGames : 0.5;

  // Creamos un multiplicador que oscile entre 0.8 (victoria sufrida) 
  // y 1.2 (victoria aplastante). Así no es excesivo pero se nota.
  // Fórmula: 0.8 + (ratio * 0.4)
  const scoreMultiplier = 0.8 + (gameRatio * 0.4);

  // 2. Lógica Elo Estándar
  const teamRating = (playerRating + partnerRating) / 2;
  const opponentsRating = (opp1Rating + opp2Rating) / 2;

  // Probabilidad esperada (0 a 1)
  const expectedScore = 1 / (1 + Math.pow(10, (opponentsRating - teamRating) / SCALE_DIVISOR));
  
  const actualScore = didWin ? 1 : 0;
  
  // 3. Cálculo final con el multiplicador de juegos
  let change = K * (actualScore - expectedScore) * scoreMultiplier;

  // 4. Nueva puntuación (Clamped 0-7)
  let newRating = playerRating + change;
  newRating = Math.max(0, Math.min(7, newRating));

  return {
    newRating: Number(newRating.toFixed(3)),
    change: Number(change.toFixed(3))
  };
}