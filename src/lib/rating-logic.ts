// lib/rating-logic.ts

export interface RatingResult {
  newRating: number;
  change: number;
}

/**
 * Calcula el cambio de nivel tras un partido considerando el margen de victoria y tipo de juego
 * @param playerRating Nivel actual del jugador
 * @param partnerRating Nivel de su pareja
 * @param opp1Rating Nivel oponente 1
 * @param opp2Rating Nivel oponente 2
 * @param gamesWon Juegos totales ganados por el equipo del jugador
 * @param gamesLost Juegos totales perdidos por el equipo del jugador
 * @param didWin true si el jugador ganó
 * @param isMixing true si es modalidad mixing (afecta un 25% respecto a un partido)
 */
export function calculateNewRating(
  playerRating: number,
  partnerRating: number,
  opp1Rating: number,
  opp2Rating: number,
  gamesWon: number,
  gamesLost: number,
  didWin: boolean,
  isMixing: boolean = false // Por defecto es un partido normal
): RatingResult {
  const K = 0.15; // Sensibilidad base
  const SCALE_DIVISOR = 3;
  
  // 1. Definir el peso según el tipo de partido
  // Si es mixing, solo cuenta el 25% (0.25). Si es partido, cuenta el 100% (1.0).
  const matchTypeWeight = isMixing ? 0.25 : 1.0;

  // 2. Calcular la "Contundencia" (Dominance Factor)
  const totalGames = gamesWon + gamesLost;
  const gameRatio = totalGames > 0 ? gamesWon / totalGames : 0.5;

  // Multiplicador de marcador (0.8 a 1.2)
  const scoreMultiplier = 0.8 + (gameRatio * 0.4);

  // 3. Lógica Elo Estándar
  const teamRating = (playerRating + partnerRating) / 2;
  const opponentsRating = (opp1Rating + opp2Rating) / 2;

  // Probabilidad esperada (0 a 1)
  const expectedScore = 1 / (1 + Math.pow(10, (opponentsRating - teamRating) / SCALE_DIVISOR));
  
  const actualScore = didWin ? 1 : 0;
  
  // 4. Cálculo final combinando:
  // Variación Elo * Multiplicador de juegos * Peso del tipo de partido
  let change = K * (actualScore - expectedScore) * scoreMultiplier * matchTypeWeight;

  // 5. Nueva puntuación (Clamped 0-7)
  let newRating = playerRating + change;
  newRating = Math.max(0, Math.min(7, newRating));

  return {
    newRating: Number(newRating.toFixed(3)),
    change: Number(change.toFixed(3))
  };
}