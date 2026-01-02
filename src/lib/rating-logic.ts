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
  playerTotalMatches: number,
  isMixing: boolean = false
): RatingResult {
  const { 
    K_PROVISIONAL, K_ESTABLISHED, PROVISIONAL_LIMIT,
    MAX_LEVEL_DIFF, RATING_DAMPENING_THRESHOLD,
    SCALE_DIVISOR, MIXING_WEIGHT, MATCH_WEIGHT, 
    MIN_RATING, MAX_RATING 
  } = RATING_CONFIG;

  // 1. Filtro de Disparidad (Si hay > 2.0 puntos de diferencia, no cuenta)
  const teamRating = (playerRating + partnerRating) / 2;
  const opponentsRating = (opp1Rating + opp2Rating) / 2;
  
  if (Math.abs(teamRating - opponentsRating) > MAX_LEVEL_DIFF) {
    return { newRating: playerRating, change: 0 };
  }

  // 2. Definir K Dinámico (Novato vs Veterano)
  let currentK = playerTotalMatches < PROVISIONAL_LIMIT ? K_PROVISIONAL : K_ESTABLISHED;
  if (playerRating > RATING_DAMPENING_THRESHOLD) currentK *= 0.8;

  // 3. NUEVA LÓGICA: Multiplicador de Intensidad (Dominancia)
  // Calculamos qué tan lejos está el resultado de un empate técnico (0.5)
  const totalGames = gamesWon + gamesLost;
  const gameRatio = totalGames > 0 ? gamesWon / totalGames : 0.5;
  
  // 'margin' será 0 si el partido fue 50/50 en juegos, y 1 si fue una paliza total (100/0)
  const margin = Math.abs(gameRatio - 0.5) * 2; 
  
  // El multiplicador ahora escala de 0.8 (partido muy reñido) a 1.2 (partido muy desigual)
  const intensityMultiplier = 0.8 + (margin * 0.4);

  // 4. Peso por tipo de partido (Match vs Mixing)
  const matchTypeWeight = isMixing ? MIXING_WEIGHT : MATCH_WEIGHT;

  // 5. Cálculo Elo Estándar
  const expectedScore = 1 / (1 + Math.pow(10, (opponentsRating - teamRating) / SCALE_DIVISOR));
  const actualScore = didWin ? 1 : 0;
  
  // El cambio final se ve afectado por la intensidad:
  // Si fue ajustado, intensityMultiplier es bajo (~0.8), reduciendo el cambio para ambos.
  let change = currentK * (actualScore - expectedScore) * intensityMultiplier * matchTypeWeight;
  let newRating = playerRating + change;

  return {
    newRating: Number(Math.max(MIN_RATING, Math.min(MAX_RATING, newRating)).toFixed(3)),
    change: Number(change.toFixed(3))
  };
}