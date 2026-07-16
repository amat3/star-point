export const RATING_CONFIG = {
  // --- FACTORES K (Volatilidad) ---
  K_PROVISIONAL: 0.40,   // K alto para los primeros partidos (sube/baja rápido)
  K_ESTABLISHED: 0.15,   // K normal para jugadores consolidados
  PROVISIONAL_LIMIT: 10, // Número de partidos para considerarse "establecido"

  // --- RESTRICCIONES ---
  DISPARITY_FULL: 1.0,   // gap ≤ 1.0 → partido vale 100%
  DISPARITY_ZERO: 2.5,   // gap ≥ 2.5 → partido vale 0%  (degradación lineal entre ambos)
  DAMPENING_START: 4.5,  // Desde aquí empieza a reducirse la volatilidad
  DAMPENING_END: 6.5,    // Aquí K queda al 60% (reducción máxima)
  
  // --- CONFIGURACIÓN BASE (La que ya tenías) ---
  SCALE_DIVISOR: 3,
  MATCH_WEIGHT: 0.70, // subido desde 0.40 el 2026-07-16 tras simular emparejamientos: con 0.40 el rating apenas diferenciaba a los jugadores (stddev ~0.19 tras 9 partidos), lo que dejaba a "similar_levels" trabajando casi a ciegas. Recalculado con carácter retroactivo — ver script de migración.
  MIN_RATING: 0,
  MAX_RATING: 7,
  INITIAL_RATING: 3.5,
  BASE_SCORE_MULTIPLIER: 0.9,
  SCORE_RATIO_WEIGHT: 0.2
} as const;