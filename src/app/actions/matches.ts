'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { calculateNewRating } from '@/lib/rating-logic'

/**
 * Utilidad para extraer el total de juegos de un string tipo "6-4 6-2" o "12-5"
 */
function parseGames(score: string) {
  let gamesA = 0
  let gamesB = 0
  
  // Normalizamos espacios y separamos por bloques
  const sets = score.trim().split(/\s+/) // ["6-4", "6-2"] o ["12-5"]
  
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

  const isMixing = match.match_type === 'mixing'
  if (isMixing) {
    console.log('🔄 Procesando partido tipo MIXING (Factor 0.25)')
  }

  // 2. Obtener los niveles actuales (rating) de los 4 jugadores
  const playerIds = [match.player_a1, match.player_a2, match.player_b1, match.player_b2]
  
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', playerIds)

  if (profilesError || !profiles || profiles.length !== 4) {
    console.error('❌ Error al obtener perfiles:', profilesError)
    if (profilesError?.message?.includes('column')) {
      console.warn('⚠️ Parece que faltan columnas en la tabla profiles:', profilesError.message)
    }
    return { success: false, error: 'No se pudieron cargar los perfiles de los jugadores' }
  }

  // Mapa para acceso rápido
  const profileMap = Object.fromEntries(profiles.map(p => [
    p.id, 
    { 
      rating: p.rating, 
      matches_played: p.matches_played || 0,
      matches_won: p.matches_won || 0
    }
  ]))

  // 3. Preparar datos para el cálculo (Juegos y Ganador)
  const { gamesA, gamesB } = parseGames(match.score_details || "")
  
  // Determinación del ganador:
  // - Si es partido estándar: sets_a > sets_b
  // - Si es mixing: gamesA > gamesB (no hay sets)
  let teamAWon = false
  if (isMixing) {
    teamAWon = gamesA > gamesB
  } else {
    teamAWon = match.sets_a > match.sets_b
  }

  console.log(`📊 Análisis (${isMixing ? 'Mixing' : 'Partido'}): Team A (${gamesA}) vs Team B (${gamesB}). Ganador: ${teamAWon ? 'A' : 'B'}`)

  // 4. Calcular nuevos ratings (pasando isMixing)
  // TEAM A
  const resultA1 = calculateNewRating(
    profileMap[match.player_a1].rating, profileMap[match.player_a2].rating,
    profileMap[match.player_b1].rating, profileMap[match.player_b2].rating,
    gamesA, gamesB, teamAWon, isMixing
  )
  const resultA2 = calculateNewRating(
    profileMap[match.player_a2].rating, profileMap[match.player_a1].rating,
    profileMap[match.player_b1].rating, profileMap[match.player_b2].rating,
    gamesA, gamesB, teamAWon, isMixing
  )

  // TEAM B
  const resultB1 = calculateNewRating(
    profileMap[match.player_b1].rating, profileMap[match.player_b2].rating,
    profileMap[match.player_a1].rating, profileMap[match.player_a2].rating,
    gamesB, gamesA, !teamAWon, isMixing
  )
  const resultB2 = calculateNewRating(
    profileMap[match.player_b2].rating, profileMap[match.player_b1].rating,
    profileMap[match.player_a1].rating, profileMap[match.player_a2].rating,
    gamesB, gamesA, !teamAWon, isMixing
  )

  // 5. Actualizar Base de Datos
  const playerUpdates = [
    { id: match.player_a1, result: resultA1, teamWon: teamAWon },
    { id: match.player_a2, result: resultA2, teamWon: teamAWon },
    { id: match.player_b1, result: resultB1, teamWon: !teamAWon },
    { id: match.player_b2, result: resultB2, teamWon: !teamAWon },
  ]

  try {
    // A. Actualizar perfiles de uno en uno
    for (const pu of playerUpdates) {
      const pm = profileMap[pu.id]
      const newPlayed = (pm.matches_played || 0) + 1
      const newWon = (pm.matches_won || 0) + (pu.teamWon ? 1 : 0)
      const newRatio = newPlayed > 0 ? newWon / newPlayed : 0

      console.log(`👤 Actualizando jugador ${pu.id}:`)
      console.log(`   - Partidos: ${pm.matches_played} -> ${newPlayed}`)
      console.log(`   - Ganados: ${pm.matches_won} -> ${newWon}`)
      console.log(`   - Win Ratio: ${newRatio}`)
      
      const { error: pError } = await supabase.from('profiles').update({ 
        rating: pu.result.newRating,
        matches_played: newPlayed,
        matches_won: newWon,
        win_ratio: newRatio
      }).eq('id', pu.id)

      if (pError) {
        console.error(`❌ Error actualizando perfil ${pu.id} (Full Update):`, pError)
        // Intentamos actualización mínima si falla por columnas nuevas
        const { error: pErrorMin } = await supabase.from('profiles').update({ 
          rating: pu.result.newRating,
          matches_played: newPlayed
        }).eq('id', pu.id)
        
        if (pErrorMin) {
          console.error(`❌ Error actualizando perfil ${pu.id} (Min Update):`, pErrorMin)
          throw new Error(`Error al actualizar el perfil del jugador: ${pErrorMin.message}`)
        }
      } else {
        console.log(`✅ Perfil ${pu.id} actualizado con éxito incluyendo stats.`)
      }
    }

    // B. Insertar en el historial de niveles (rating_history)
    const historyEntries = playerUpdates.map(pu => ({
      player_id: pu.id,
      match_id: match.id,
      rating_before: profileMap[pu.id].rating,
      rating_after: pu.result.newRating
    }))

    const { error: hError } = await supabase.from('rating_history').insert(historyEntries)
    if (hError) {
      console.warn('⚠️ No se pudo guardar el historial de nivel:', hError.message)
    }

    // C. Marcar partido como confirmado
    console.log('🏁 Marcando partido como confirmado...')
    const { error: mError } = await supabase.from('matches').update({ 
      status: 'confirmed',
      rating_change: resultA1.change
    }).eq('id', matchId)

    if (mError) {
      console.error('❌ Error al actualizar estado del partido:', mError)
      const { error: mErrorMin } = await supabase.from('matches').update({ 
        status: 'confirmed'
      }).eq('id', matchId)
      
      if (mErrorMin) throw new Error(`Error al confirmar el partido: ${mErrorMin.message}`)
    }

    console.log('✅ Partido confirmado con éxito.')

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