import { RATING_CONFIG } from './config';

export interface RatingResult {
  newRating: number;
  change: number;
}

export function calculateNewRating(
  playerRating: number,
  partnerRating: number,
  opp1Rating: number,
  opp2Rating: number,
  gamesWon: number,
  gamesLost: number,
  didWin: boolean,
  playerTotalMatches: number, // <--- NUEVO PARAMETRO
  isMixing: boolean = false
): RatingResult {
  const { 
    K_PROVISIONAL, K_ESTABLISHED, PROVISIONAL_LIMIT,
    MAX_LEVEL_DIFF, RATING_DAMPENING_THRESHOLD,
    SCALE_DIVISOR, MIXING_WEIGHT, MATCH_WEIGHT, 
    BASE_SCORE_MULTIPLIER, SCORE_RATIO_WEIGHT,
    MIN_RATING, MAX_RATING 
  } = RATING_CONFIG;

  // 1. Filtro de Disparidad
  const teamRating = (playerRating + partnerRating) / 2;
  const opponentsRating = (opp1Rating + opp2Rating) / 2;
  
  if (Math.abs(teamRating - opponentsRating) > MAX_LEVEL_DIFF) {
    return { newRating: playerRating, change: 0 }; // No cuenta
  }

  // 2. Definir K Dinámico
  let currentK = playerTotalMatches < PROVISIONAL_LIMIT ? K_PROVISIONAL : K_ESTABLISHED;
  
  // Freno en la cima (niveles altos suben más lento)
  if (playerRating > RATING_DAMPENING_THRESHOLD) {
    currentK = currentK * 0.8;
  }

  // 3. Pesos y Multiplicadores
  const matchTypeWeight = isMixing ? MIXING_WEIGHT : MATCH_WEIGHT;
  const totalGames = gamesWon + gamesLost;
  const gameRatio = totalGames > 0 ? gamesWon / totalGames : 0.5;
  const scoreMultiplier = BASE_SCORE_MULTIPLIER + (gameRatio * SCORE_RATIO_WEIGHT);

  // 4. Cálculo Elo
  const expectedScore = 1 / (1 + Math.pow(10, (opponentsRating - teamRating) / SCALE_DIVISOR));
  const actualScore = didWin ? 1 : 0;
  
  let change = currentK * (actualScore - expectedScore) * scoreMultiplier * matchTypeWeight;
  let newRating = playerRating + change;

  return {
    newRating: Number(Math.max(MIN_RATING, Math.min(MAX_RATING, newRating)).toFixed(3)),
    change: Number(change.toFixed(3))
  };
}