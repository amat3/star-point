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

export async function getPlayerGameStats(userId: string) {
  const supabase = await createClient()

  const { data: matches } = await supabase
    .from('matches')
    .select('player_a1, player_a2, score_details')
    .eq('status', 'confirmed')
    .or(`player_a1.eq.${userId},player_a2.eq.${userId},player_b1.eq.${userId},player_b2.eq.${userId}`)

  let gamesWon = 0
  let gamesLost = 0

  for (const match of matches ?? []) {
    const isTeamA = match.player_a1 === userId || match.player_a2 === userId
    const { gamesA, gamesB } = parseGames(match.score_details || '')
    gamesWon += isTeamA ? gamesA : gamesB
    gamesLost += isTeamA ? gamesB : gamesA
  }

  return { gamesWon, gamesLost }
}

export type PlayerProfileDetails = {
  id: string
  full_name: string | null
  avatar_url: string | null
  gender: 'masculino' | 'femenino' | 'otro' | null
  preferred_hand: 'diestro' | 'zurdo' | 'ambidiestro' | null
  court_position: 'reves' | 'drive' | 'ambos' | null
  matches_played: number
  win_ratio: number
  gamesWon: number
  gamesLost: number
  is_guest: boolean
}

export async function getPlayerProfileDetails(userId: string): Promise<PlayerProfileDetails | null> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, gender, preferred_hand, court_position, matches_played, win_ratio, is_guest')
    .eq('id', userId)
    .maybeSingle()

  if (!profile) return null

  const { gamesWon, gamesLost } = await getPlayerGameStats(userId)

  return { ...profile, gamesWon, gamesLost }
}

export async function confirmMatch(matchId: string) {
  console.log('🎾 Iniciando confirmación de partido:', matchId)
  const supabase = await createClient()

  // 1. Obtener los detalles del partido
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('*, events(is_test)')
    .eq('id', matchId)
    .single()

  if (matchError || !match) {
    console.error('❌ Partido no encontrado:', matchError)
    return { success: false, error: 'Partido no encontrado' }
  }

  // Check Auth and Permissions
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Acceso denegado' }

  // Check Admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'
  const isCreator = match.creator_id === user.id
  const isParticipant = [match.player_a1, match.player_a2, match.player_b1, match.player_b2].includes(user.id)

  if (!isAdmin && !isCreator && !isParticipant) {
     return { success: false, error: 'No tienes permisos para confirmar este partido' }
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
      .eq('id', matchId)
    if (testError) return { success: false, error: testError.message }
    revalidatePath('/dashboard')
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
  const resultA1 = calculateNewRating(
    profileMap[match.player_a1].rating, profileMap[match.player_a2].rating,
    profileMap[match.player_b1].rating, profileMap[match.player_b2].rating,
    gamesA, gamesB, resultTypeA, matchesA1
  )
  const resultA2 = calculateNewRating(
    profileMap[match.player_a2].rating, profileMap[match.player_a1].rating,
    profileMap[match.player_b1].rating, profileMap[match.player_b2].rating,
    gamesA, gamesB, resultTypeA, matchesA2
  )

  // TEAM B
  const resultB1 = calculateNewRating(
    profileMap[match.player_b1].rating, profileMap[match.player_b2].rating,
    profileMap[match.player_a1].rating, profileMap[match.player_a2].rating,
    gamesB, gamesA, resultTypeB, matchesB1
  )
  const resultB2 = calculateNewRating(
    profileMap[match.player_b2].rating, profileMap[match.player_b1].rating,
    profileMap[match.player_a1].rating, profileMap[match.player_a2].rating,
    gamesB, gamesA, resultTypeB, matchesB2
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
      p_match_id: matchId,
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
    revalidatePath('/dashboard')
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

export async function updateMatchScore(
  matchId: string,
  data: {
    score_details: string
  }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  // 1. Get Match to verify permission
  const { data: match, error: fetchError } = await supabase
    .from('matches')
    .select('creator_id, status, player_a1, player_a2, player_b1, player_b2')
    .eq('id', matchId)
    .single()

  if (fetchError || !match) throw new Error('Partido no encontrado')

  // 2. Permission check (Creator, Admin, or Participant)
  const isCreator = match.creator_id === user.id

  if (!isCreator) {
    const isParticipant = [match.player_a1, match.player_a2, match.player_b1, match.player_b2].includes(user.id)
    if (!isParticipant) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') throw new Error('No tienes permiso para editar este partido')
    }
  }

  // 3. Status check
  if (match.status !== 'pending' && match.status !== 'disputed') {
    throw new Error('Solo se pueden editar partidos pendientes o disputados')
  }

  const updateData = {
    score_details: data.score_details,
    sets_a: 0,
    sets_b: 0,
    status: 'pending',
    last_updated_by: user.id,
  }

  const { error } = await supabase
    .from('matches')
    .update(updateData)
    .eq('id', matchId)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  return { success: true }
}

export async function getUserMatches(userId: string, limit: number, page: number) {
  const supabase = await createClient()

  // Calculate range for pagination
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, count, error } = await supabase
    .from('matches')
    .select(`
      *,
      event:events(title),
      p_a1:profiles!player_a1(full_name, is_guest, avatar_url),
      p_a2:profiles!player_a2(full_name, is_guest, avatar_url),
      p_b1:profiles!player_b1(full_name, is_guest, avatar_url),
      p_b2:profiles!player_b2(full_name, is_guest, avatar_url)
    `, { count: 'exact' })
    .or(`player_a1.eq.${userId},player_a2.eq.${userId},player_b1.eq.${userId},player_b2.eq.${userId}`)
    .eq('status', 'confirmed') // Only finished/confirmed matches
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('Error fetching user matches:', error)
    return { matches: [], totalCount: 0, error: error.message }
  }

  // Transform data to flat structure if needed, or keep as is.
  // We'll keep it as is but careful with types in the client component.
  return { matches: data, totalCount: count || 0, error: null }
}