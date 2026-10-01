import type { SupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { calculateNewRating, applyGuestProtection } from '@/lib/rating-logic'

/**
 * Helper para extraer juegos totales de un marcador tipo "6-4 6-2" o "12-5"
 */
export function parseGames(score: string) {
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

export type ConfirmableMatch = {
  id: string
  event_id: string | null
  score_details: string | null
  player_a1: string
  player_a2: string
  player_b1: string
  player_b2: string
  events: { is_test: boolean } | null
}

/**
 * Calcula los ratings y confirma el partido. No comprueba permisos: quien
 * llama es responsable de ello (la acción del usuario o el cierre automático).
 * Es un módulo normal (no 'use server'), por lo que no es invocable desde el cliente.
 */
export async function applyMatchConfirmation(
  supabase: SupabaseClient,
  match: ConfirmableMatch
): Promise<{ success: boolean; error?: string }> {
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
      matches_won: p.matches_won || 0,
      is_guest: p.is_guest || false
    }
  ]))

  const matchHasGuest = playerIds.some(id => profileMap[id].is_guest)

  // 3. Experiencia previa para K-Factor — usamos matches_played del perfil (fuente canónica)
  const matchesA1 = profileMap[match.player_a1].matches_played
  const matchesA2 = profileMap[match.player_a2].matches_played
  const matchesB1 = profileMap[match.player_b1].matches_played
  const matchesB2 = profileMap[match.player_b2].matches_played

  console.log('📊 Experiencia (Partidos previos jugados):', {
    A1: matchesA1, A2: matchesA2, B1: matchesB1, B2: matchesB2
  })

  // 4. Preparar datos de juego (Juegos y Ganador)
  const { gamesA, gamesB } = parseGames(match.score_details || "")

  if (gamesA === 0 && gamesB === 0) {
    return { success: false, error: 'El partido no tiene marcador registrado. Añade el resultado antes de confirmar.' }
  }

  // Evento de prueba: confirmar sin actualizar ratings ni estadísticas
  const isTestEvent = (match.events as { is_test: boolean } | null)?.is_test ?? false
  if (isTestEvent) {
    const { getAdminClient } = await import('@/utils/supabase/admin')
    const adminSupabase = getAdminClient()
    const { error: testError } = await adminSupabase
      .from('matches')
      .update({ status: 'confirmed' })
      .eq('id', match.id)
    if (testError) return { success: false, error: testError.message }
    revalidatePath('/')
    return { success: true }
  }

  const isDraw = gamesA === gamesB
  const teamAWon = gamesA > gamesB
  const teamBWon = gamesB > gamesA

  const resultTypeA: 'win' | 'draw' | 'loss' = isDraw ? 'draw' : teamAWon ? 'win' : 'loss'
  const resultTypeB: 'win' | 'draw' | 'loss' = isDraw ? 'draw' : teamBWon ? 'win' : 'loss'

  console.log(`📊 Análisis: Juegos A=${gamesA} B=${gamesB}. Resultado: ${isDraw ? 'Empate' : teamAWon ? 'Gana A' : 'Gana B'}`)

  // 5. Calcular nuevos ratings

  // TEAM A
  const resultA1 = applyGuestProtection(
    profileMap[match.player_a1].rating,
    calculateNewRating(
      profileMap[match.player_a1].rating, profileMap[match.player_a2].rating,
      profileMap[match.player_b1].rating, profileMap[match.player_b2].rating,
      gamesA, gamesB, resultTypeA, matchesA1
    ),
    matchHasGuest, profileMap[match.player_a1].is_guest
  )
  const resultA2 = applyGuestProtection(
    profileMap[match.player_a2].rating,
    calculateNewRating(
      profileMap[match.player_a2].rating, profileMap[match.player_a1].rating,
      profileMap[match.player_b1].rating, profileMap[match.player_b2].rating,
      gamesA, gamesB, resultTypeA, matchesA2
    ),
    matchHasGuest, profileMap[match.player_a2].is_guest
  )

  // TEAM B
  const resultB1 = applyGuestProtection(
    profileMap[match.player_b1].rating,
    calculateNewRating(
      profileMap[match.player_b1].rating, profileMap[match.player_b2].rating,
      profileMap[match.player_a1].rating, profileMap[match.player_a2].rating,
      gamesB, gamesA, resultTypeB, matchesB1
    ),
    matchHasGuest, profileMap[match.player_b1].is_guest
  )
  const resultB2 = applyGuestProtection(
    profileMap[match.player_b2].rating,
    calculateNewRating(
      profileMap[match.player_b2].rating, profileMap[match.player_b1].rating,
      profileMap[match.player_a1].rating, profileMap[match.player_a2].rating,
      gamesB, gamesA, resultTypeB, matchesB2
    ),
    matchHasGuest, profileMap[match.player_b2].is_guest
  )

  // 6. Preparar actualizaciones de BD
  const playerUpdates = [
    { id: match.player_a1, result: resultA1, teamWon: teamAWon },
    { id: match.player_a2, result: resultA2, teamWon: teamAWon },
    { id: match.player_b1, result: resultB1, teamWon: teamBWon },
    { id: match.player_b2, result: resultB2, teamWon: teamBWon },
  ]

  try {
    // A+B+C en una sola transacción atómica vía RPC
    const rpcPayload = playerUpdates.map(pu => {
      const pm = profileMap[pu.id]
      const newPlayed = (pm.matches_played || 0) + 1
      const newWon = (pm.matches_won || 0) + (pu.teamWon ? 1 : 0)
      const newRatio = newPlayed > 0 ? newWon / newPlayed : 0
      return {
        player_id: pu.id,
        new_rating: pu.result.newRating,
        new_matches_played: newPlayed,
        new_matches_won: newWon,
        new_win_ratio: newRatio,
        rating_before: pm.rating,
      }
    })

    const { error: rpcError } = await supabase.rpc('confirm_match_atomic', {
      p_match_id: match.id,
      p_rating_change: resultA1.change,
      p_player_updates: rpcPayload,
    })

    if (rpcError) {
      if (rpcError.message?.includes('ALREADY_CONFIRMED')) {
        return { success: false, error: 'Este partido ya fue validado anteriormente' }
      }
      throw new Error(`Error confirmando partido: ${rpcError.message}`)
    }

    console.log('✅ Partido confirmado y procesado con éxito.')

    // 7. Refrescar UI
    revalidatePath('/')
    revalidatePath('/ranking')
    revalidatePath('/profile')
    if (match.event_id) {
      revalidatePath(`/events/${match.event_id}`)
      revalidatePath(`/admin/events/${match.event_id}/generate`)
    }

    return { success: true }

  } catch (error) {
    console.error('❌ Error en transacción:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido al confirmar' }
  }
}
