export const RATING_CONFIG = {
  K_FACTOR: 0.15,          // Base sensitivity for Elo calculation
  SCALE_DIVISOR: 3,        // Divisor for the exponent in expected score formula
  MIXING_WEIGHT: 0.25,     // Weight multiplier for 'mixing' match types
  MATCH_WEIGHT: 1.0,       // Weight multiplier for standard match types
  
  // Rating boundaries
  MIN_RATING: 0,
  MAX_RATING: 7,
  
  // Score multiplier logic
  BASE_SCORE_MULTIPLIER: 0.8,
  SCORE_RATIO_WEIGHT: 0.4
} as const;
