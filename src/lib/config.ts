export const RATING_CONFIG = {
  // --- FACTORES K (Volatilidad) ---
  K_PROVISIONAL: 0.40,   // K alto para los primeros partidos (sube/baja rápido)
  K_ESTABLISHED: 0.15,   // K normal para jugadores consolidados
  PROVISIONAL_LIMIT: 10, // Número de partidos para considerarse "establecido"

  // --- RESTRICCIONES ---
  MAX_LEVEL_DIFF: 2.0,   // Si la diferencia de medias es mayor a 2.0, no puntúa
  RATING_DAMPENING_THRESHOLD: 5.0, // A partir de este nivel, cuesta más subir
  
  // --- CONFIGURACIÓN BASE (La que ya tenías) ---
  SCALE_DIVISOR: 3,
  MIXING_WEIGHT: 0.25,
  MATCH_WEIGHT: 1.0,
  MIN_RATING: 0,
  MAX_RATING: 7,
  INITIAL_RATING: 3.5,
  BASE_SCORE_MULTIPLIER: 0.8,
  SCORE_RATIO_WEIGHT: 0.4
} as const;