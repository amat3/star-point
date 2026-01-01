// lib/rating-logic.ts
import { RATING_CONFIG } from './config';
import { RatingResult } from '@/types';

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
  isMixing: boolean = false
): RatingResult {
  const { 
    K_FACTOR, 
    SCALE_DIVISOR, 
    MIXING_WEIGHT, 
    MATCH_WEIGHT, 
    BASE_SCORE_MULTIPLIER, 
    SCORE_RATIO_WEIGHT, 
    MIN_RATING, 
    MAX_RATING 
  } = RATING_CONFIG;
  
  // 1. Definir el peso según el tipo de partido
  const matchTypeWeight = isMixing ? MIXING_WEIGHT : MATCH_WEIGHT;

  // 2. Calcular la "Contundencia" (Dominance Factor)
  const totalGames = gamesWon + gamesLost;
  const gameRatio = totalGames > 0 ? gamesWon / totalGames : 0.5;

  // Multiplicador de marcador (0.8 a 1.2)
  const scoreMultiplier = BASE_SCORE_MULTIPLIER + (gameRatio * SCORE_RATIO_WEIGHT);

  // 3. Lógica Elo Estándar
  const teamRating = (playerRating + partnerRating) / 2;
  const opponentsRating = (opp1Rating + opp2Rating) / 2;

  // Probabilidad esperada (0 a 1)
  const expectedScore = 1 / (1 + Math.pow(10, (opponentsRating - teamRating) / SCALE_DIVISOR));
  
  const actualScore = didWin ? 1 : 0;
  
  // 4. Cálculo final combinando:
  // Variación Elo * Multiplicador de juegos * Peso del tipo de partido
  let change = K_FACTOR * (actualScore - expectedScore) * scoreMultiplier * matchTypeWeight;

  // 5. Nueva puntuación (Clamped)
  let newRating = playerRating + change;
  newRating = Math.max(MIN_RATING, Math.min(MAX_RATING, newRating));

  return {
    newRating: Number(newRating.toFixed(3)),
    change: Number(change.toFixed(3))
  };
}