'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { calculateNewRating } from '@/lib/rating-logic'

/**
 * Helper para extraer juegos totales de un marcador tipo "6-4 6-2" o "12-5"
 */
function parseGames(score: string) {
  let gamesA = 0
  let gamesB = 0
  
  if (!score) return { gamesA: 0, gamesB: 0 }

  // Divide por espacios para separar sets
  const parts = score.split(' ') 
  
  parts.forEach(part => {
    // Divide por guión para sacar juegos de cada lado
    const [a, b] = part.split('-').map(Number)
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

  // 2. Obtener los perfiles actuales de los 4 jugadores
  const playerIds = [match.player_a1, match.player_a2, match.player_b1, match.player_b2]
  
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', playerIds)

  if (profilesError || !profiles || profiles.length !== 4) {
    console.error('❌ Error al obtener perfiles:', profilesError)
    return { success: false, error: 'No se pudieron cargar los perfiles de los jugadores' }
  }

  // Mapa para acceso rápido a datos del perfil
  const profileMap = Object.fromEntries(profiles.map(p => [
    p.id, 
    { 
      rating: p.rating, 
      matches_played: p.matches_played || 0,
      matches_won: p.matches_won || 0
    }
  ]))

  // 3. Obtener Experiencia Previa (CRÍTICO PARA ELO DINÁMICO)
  // Consultamos cuántos registros hay en rating_history para saber el K-Factor a aplicar
  const getMatchCount = async (playerId: string) => {
    const { count } = await supabase
      .from('rating_history')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', playerId)
    return count || 0
  }

  // Ejecutamos las 4 consultas en paralelo
  const [matchesA1, matchesA2, matchesB1, matchesB2] = await Promise.all([
    getMatchCount(match.player_a1),
    getMatchCount(match.player_a2),
    getMatchCount(match.player_b1),
    getMatchCount(match.player_b2)
  ])

  console.log('📊 Experiencia (Partidos previos jugados):', {
    A1: matchesA1, A2: matchesA2, B1: matchesB1, B2: matchesB2
  })

  // 4. Preparar datos de juego (Juegos y Ganador)
  const { gamesA, gamesB } = parseGames(match.score_details || "")
  
  let teamAWon = false
  if (isMixing) {
    teamAWon = gamesA > gamesB
  } else {
    teamAWon = match.sets_a > match.sets_b
  }

  console.log(`📊 Análisis: Team A (${gamesA}) vs Team B (${gamesB}). Ganador: ${teamAWon ? 'A' : 'B'}`)

  // 5. Calcular nuevos ratings
  // Pasamos 'matchesXX' (experiencia) a la función de cálculo
  
  // TEAM A
  const resultA1 = calculateNewRating(
    profileMap[match.player_a1].rating, profileMap[match.player_a2].rating,
    profileMap[match.player_b1].rating, profileMap[match.player_b2].rating,
    gamesA, gamesB, teamAWon, matchesA1, isMixing
  )
  const resultA2 = calculateNewRating(
    profileMap[match.player_a2].rating, profileMap[match.player_a1].rating,
    profileMap[match.player_b1].rating, profileMap[match.player_b2].rating,
    gamesA, gamesB, teamAWon, matchesA2, isMixing
  )

  // TEAM B
  const resultB1 = calculateNewRating(
    profileMap[match.player_b1].rating, profileMap[match.player_b2].rating,
    profileMap[match.player_a1].rating, profileMap[match.player_a2].rating,
    gamesB, gamesA, !teamAWon, matchesB1, isMixing
  )
  const resultB2 = calculateNewRating(
    profileMap[match.player_b2].rating, profileMap[match.player_b1].rating,
    profileMap[match.player_a1].rating, profileMap[match.player_a2].rating,
    gamesB, gamesA, !teamAWon, matchesB2, isMixing
  )

  // 6. Preparar actualizaciones de BD
  const playerUpdates = [
    { id: match.player_a1, result: resultA1, teamWon: teamAWon },
    { id: match.player_a2, result: resultA2, teamWon: teamAWon },
    { id: match.player_b1, result: resultB1, teamWon: !teamAWon },
    { id: match.player_b2, result: resultB2, teamWon: !teamAWon },
  ]

  try {
    // A. Actualizar perfiles (Rating + Estadísticas)
    for (const pu of playerUpdates) {
      const pm = profileMap[pu.id]
      const newPlayed = (pm.matches_played || 0) + 1
      const newWon = (pm.matches_won || 0) + (pu.teamWon ? 1 : 0)
      const newRatio = newPlayed > 0 ? newWon / newPlayed : 0

      // Intentamos actualizar todo (stats + rating)
      const { error: pError } = await supabase.from('profiles').update({ 
        rating: pu.result.newRating,
        matches_played: newPlayed,
        matches_won: newWon,
        win_ratio: newRatio
      }).eq('id', pu.id)

      if (pError) {
        console.error(`❌ Error actualizando stats perfil ${pu.id}:`, pError)
        // Fallback: Si fallan las stats, actualizamos solo el rating
        const { error: pErrorMin } = await supabase.from('profiles').update({ 
          rating: pu.result.newRating
        }).eq('id', pu.id)
        
        if (pErrorMin) throw new Error(`Error crítico al actualizar perfil: ${pErrorMin.message}`)
      }
    }

    // B. Insertar historial de cambios
    const historyEntries = playerUpdates.map(pu => ({
      player_id: pu.id,
      match_id: match.id,
      rating_before: profileMap[pu.id].rating,
      rating_after: pu.result.newRating
    }))

    const { error: hError } = await supabase.from('rating_history').insert(historyEntries)
    if (hError) console.warn('⚠️ Error guardando historial:', hError.message)

    // C. Marcar partido como confirmado
    const { error: mError } = await supabase.from('matches').update({ 
      status: 'confirmed',
      rating_change: resultA1.change // Guardamos referencia del cambio de A1
    }).eq('id', matchId)

    if (mError) throw new Error(`Error al confirmar partido: ${mError.message}`)

    console.log('✅ Partido confirmado y procesado con éxito.')

    // 7. Refrescar UI
    revalidatePath('/dashboard')
    revalidatePath('/ranking')
    revalidatePath('/profile')

    return { success: true }

  } catch (error: any) {
    console.error('❌ Error en transacción:', error)
    return { success: false, error: error.message || 'Error desconocido al confirmar' }
  }
}

export async function updateMatchScore(
  matchId: string, 
  data: { 
    sets_a?: number
    sets_b?: number
    games_a?: number // For Mixing
    games_b?: number // For Mixing
    score_details: string
  }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  // 1. Get Match to verify permission
  const { data: match, error: fetchError } = await supabase
    .from('matches')
    .select('creator_id, status, match_type')
    .eq('id', matchId)
    .single()

  if (fetchError || !match) throw new Error('Partido no encontrado')

  // 2. Permission check (Creator or Admin)
  const isCreator = match.creator_id === user.id
  
  if (!isCreator) {
    // Check if admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      throw new Error('No tienes permiso para editar este partido')
    }
  }

  // 3. Status check
  if (match.status !== 'pending' && match.status !== 'disputed') {
    throw new Error('Solo se pueden editar partidos pendientes o disputados')
  }

  // 4. Update logic
  const updateData: any = {
    score_details: data.score_details,
    // Reset disputes if edited
    status: 'pending' 
  }

  if (match.match_type === 'mixing') {
    updateData.sets_a = 0
    updateData.sets_b = 0
    // We rely on score_details for the games
  } else {
    // Standard match
    if (data.sets_a === undefined || data.sets_b === undefined) {
      throw new Error('Faltan datos de sets para partido estándar')
    }
    updateData.sets_a = data.sets_a
    updateData.sets_b = data.sets_b
  }

  const { error } = await supabase
    .from('matches')
    .update(updateData)
    .eq('id', matchId)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  return { success: true }
}