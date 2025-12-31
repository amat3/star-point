'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { calculateNewRating } from '@/lib/rating-logic'

/**
 * Utilidad para extraer el total de juegos de un string tipo "6-4 6-2"
 */
function parseGames(score: string) {
  let gamesA = 0
  let gamesB = 0
  
  const sets = score.split(' ') // ["6-4", "6-2"]
  
  sets.forEach(set => {
    const [a, b] = set.split('-').map(Number)
    if (!isNaN(a) && !isNaN(b)) {
      gamesA += a
      gamesB += b
    }
  })
  
  return { gamesA, gamesB }
}

export async function confirmMatch(matchId: string) {
  console.log('🎾 Iniciando confirmación de partido:', matchId)
  const supabase = await createClient()

  // 1. Obtener los detalles del partido
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (matchError || !match) {
    console.error('❌ Partido no encontrado:', matchError)
    return { success: false, error: 'Partido no encontrado' }
  }

  if (match.status === 'confirmed') {
    return { success: false, error: 'Este partido ya fue validado anteriormente' }
  }

  // 2. Obtener los niveles actuales (rating) de los 4 jugadores
  const playerIds = [match.player_a1, match.player_a2, match.player_b1, match.player_b2]
  
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, rating, matches_played')
    .in('id', playerIds)

  if (profilesError || !profiles || profiles.length !== 4) {
    console.error('❌ Error al obtener perfiles:', profilesError)
    return { success: false, error: 'No se pudieron cargar los perfiles de los jugadores' }
  }

  // Mapa para acceso rápido: { id_jugador: { rating, matches_played } }
  const profileMap = Object.fromEntries(profiles.map(p => [p.id, { rating: p.rating, matches_played: p.matches_played || 0 }]))

  // 3. Preparar datos para el cálculo (Juegos y Ganador)
  const { gamesA, gamesB } = parseGames(match.score_details || "")
  const teamAWon = match.sets_a > match.sets_b

  console.log(`📊 Análisis: Team A (${gamesA} juegos) vs Team B (${gamesB} juegos). Ganador: ${teamAWon ? 'A' : 'B'}`)

  // 4. Calcular nuevos ratings usando la lógica de margen de victoria
  // TEAM A
  const resultA1 = calculateNewRating(
    profileMap[match.player_a1].rating, profileMap[match.player_a2].rating,
    profileMap[match.player_b1].rating, profileMap[match.player_b2].rating,
    gamesA, gamesB, teamAWon
  )
  const resultA2 = calculateNewRating(
    profileMap[match.player_a2].rating, profileMap[match.player_a1].rating,
    profileMap[match.player_b1].rating, profileMap[match.player_b2].rating,
    gamesA, gamesB, teamAWon
  )

  // TEAM B
  const resultB1 = calculateNewRating(
    profileMap[match.player_b1].rating, profileMap[match.player_b2].rating,
    profileMap[match.player_a1].rating, profileMap[match.player_a2].rating,
    gamesB, gamesA, !teamAWon
  )
  const resultB2 = calculateNewRating(
    profileMap[match.player_b2].rating, profileMap[match.player_b1].rating,
    profileMap[match.player_a1].rating, profileMap[match.player_a2].rating,
    gamesB, gamesA, !teamAWon
  )

  // 5. Actualizar Base de Datos
  try {
    // A. Actualizar ratings y conteo de partidos en profiles
    const updates = [
      supabase.from('profiles').update({ 
        rating: resultA1.newRating,
        matches_played: (profileMap[match.player_a1].matches_played || 0) + 1
      }).eq('id', match.player_a1),
      supabase.from('profiles').update({ 
        rating: resultA2.newRating,
        matches_played: (profileMap[match.player_a2].matches_played || 0) + 1
      }).eq('id', match.player_a2),
      supabase.from('profiles').update({ 
        rating: resultB1.newRating,
        matches_played: (profileMap[match.player_b1].matches_played || 0) + 1
      }).eq('id', match.player_b1),
      supabase.from('profiles').update({ 
        rating: resultB2.newRating,
        matches_played: (profileMap[match.player_b2].matches_played || 0) + 1
      }).eq('id', match.player_b2),
    ]

    // B. Insertar en el historial de niveles (rating_history)
    const historyEntries = [
      { player_id: match.player_a1, match_id: match.id, rating_before: profileMap[match.player_a1].rating, rating_after: resultA1.newRating },
      { player_id: match.player_a2, match_id: match.id, rating_before: profileMap[match.player_a2].rating, rating_after: resultA2.newRating },
      { player_id: match.player_b1, match_id: match.id, rating_before: profileMap[match.player_b1].rating, rating_after: resultB1.newRating },
      { player_id: match.player_b2, match_id: match.id, rating_before: profileMap[match.player_b2].rating, rating_after: resultB2.newRating },
    ]

    const historyInsert = supabase.from('rating_history').insert(historyEntries)

    // C. Marcar partido como confirmado y guardar el cambio promedio (opcional)
    const matchUpdate = supabase.from('matches').update({ 
      status: 'confirmed',
      rating_change: resultA1.change // Guardamos cuánto varió para referencia
    }).eq('id', matchId)

    // Ejecutar todas las actualizaciones
    const results = await Promise.all([...updates, historyInsert, matchUpdate])
    
    // Verificar si alguna falló
    const errorResult = results.find(r => r.error)
    if (errorResult) {
      console.error('❌ Error en la actualización de la base de datos:', errorResult.error)
      throw errorResult.error
    }

    console.log('✅ Partido confirmado, niveles y estadísticas actualizados con éxito.')

    // 6. Refrescar la UI
    revalidatePath('/dashboard')
    revalidatePath('/ranking')
    revalidatePath('/profile')

    return { success: true }

  } catch (error: any) {
    console.error('❌ Error crítico en la transacción:', error)
    return { success: false, error: error.message || 'Error al procesar la validación' }
  }
}