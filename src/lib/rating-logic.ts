// lib/rating-logic.ts
import { RATING_CONFIG } from './config';
import { RatingResult } from '@/types';

export function calculateNewRating(
  playerRating: number,
  partnerRating: number,
  opp1Rating: number,
  opp2Rating: number,
  gamesWon: number,
  gamesLost: number,
  didWin: boolean,
  playerTotalMatches: number
): RatingResult {
  const {
    K_PROVISIONAL, K_ESTABLISHED, PROVISIONAL_LIMIT,
    DISPARITY_FULL, DISPARITY_ZERO,
    DAMPENING_START, DAMPENING_END,
    SCALE_DIVISOR, MATCH_WEIGHT,
    MIN_RATING, MAX_RATING,
    BASE_SCORE_MULTIPLIER, SCORE_RATIO_WEIGHT
  } = RATING_CONFIG;

  // 1. Filtro de Disparidad — degradación lineal en lugar de corte binario
  const teamRating = (playerRating + partnerRating) / 2;
  const opponentsRating = (opp1Rating + opp2Rating) / 2;
  const gap = Math.abs(teamRating - opponentsRating);

  let disparityWeight: number;
  if (gap <= DISPARITY_FULL) {
    disparityWeight = 1.0;
  } else if (gap >= DISPARITY_ZERO) {
    disparityWeight = 0.0;
  } else {
    disparityWeight = 1 - (gap - DISPARITY_FULL) / (DISPARITY_ZERO - DISPARITY_FULL);
  }

  if (disparityWeight === 0) {
    return { newRating: playerRating, change: 0 };
  }

  // 2. K dinámico — curva suave entre DAMPENING_START y DAMPENING_END
  let currentK = playerTotalMatches < PROVISIONAL_LIMIT ? K_PROVISIONAL : K_ESTABLISHED;
  if (playerRating > DAMPENING_START) {
    const dampFactor = Math.min(1, (playerRating - DAMPENING_START) / (DAMPENING_END - DAMPENING_START));
    currentK *= (1 - dampFactor * 0.4); // Reduce hasta 60% de K en el extremo
  }

  // 3. Multiplicador de intensidad — rango estrecho 0.9–1.1
  const totalGames = gamesWon + gamesLost;
  const gameRatio = totalGames > 0 ? gamesWon / totalGames : 0.5;
  const margin = Math.abs(gameRatio - 0.5) * 2;
  const intensityMultiplier = BASE_SCORE_MULTIPLIER + (margin * SCORE_RATIO_WEIGHT);

  // 4. Cálculo Elo Estándar
  const expectedScore = 1 / (1 + Math.pow(10, (opponentsRating - teamRating) / SCALE_DIVISOR));
  const actualScore = didWin ? 1 : 0;

  let change = currentK * (actualScore - expectedScore) * intensityMultiplier * MATCH_WEIGHT * disparityWeight;
  let newRating = playerRating + change;

  return {
    newRating: Number(Math.max(MIN_RATING, Math.min(MAX_RATING, newRating)).toFixed(3)),
    change: Number(change.toFixed(3))
  };
}