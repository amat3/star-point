'use server'

import { createClient } from '@/utils/supabase/server'
import { getAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendPushToUsers } from '@/lib/push'

export async function deleteMatch(matchId: string) {
  console.log('🗑️ Eliminando partido:', matchId)
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'No estás autenticado' }
  }

  // Verificar permisos (Admin o Creador)
  const { data: match } = await supabase.from('matches').select('creator_id, status').eq('id', matchId).single()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (!match || !profile) {
    return { success: false, error: 'No se encontró el partido o el usuario' }
  }

  // Verificar que el partido esté pendiente o en disputa
  if (match.status !== 'pending' && match.status !== 'disputed') {
    return { success: false, error: 'Solo se pueden eliminar partidos pendientes o en disputa.' }
  }

  const isAdmin = profile.role === 'admin'
  const isCreator = match.creator_id === user.id

  if (!isAdmin && !isCreator) {
    return { success: false, error: 'No tienes permiso para eliminar este partido' }
  }

  // Intentar borrado como Admin (Service Role) si es Admin (independientemente de si es creador)
  // Esto asegura que el admin siempre pueda borrar bypassing RLS
  if (isAdmin) {
    const adminSupabase = getAdminClient()
    
    // Usamos count para verificar si realmente se borró
    const { error, count } = await adminSupabase.from('matches').delete({ count: 'exact' }).eq('id', matchId)
    
    if (error) {
      console.error('❌ Error eliminando (Admin):', error)
      return { success: false, error: `Error DB: ${error.message}` }
    }

    if (count === 0) {
      return { success: false, error: 'No se encontró el partido o ya fue eliminado.' }
    }
    
    revalidatePath('/')
    return { success: true }
  }

  // Borrado estándar (User RLS) - Solo si es creador (ya validado arriba, pero por seguridad)
  const { error, count } = await supabase.from('matches').delete({ count: 'exact' }).eq('id', matchId)

  if (error) {
    console.error('❌ Error eliminando partido:', error)
    return { success: false, error: error.message }
  }

  if (count === 0) {
     return { success: false, error: 'No se pudo eliminar. Verifica permisos RLS.' }
  }

  revalidatePath('/')
  return { success: true }
}

type CourtChange = { success: true } | { success: false; error: string }

// Players of the given matches, for the "your court changed" push (guests have no device)
async function notifyCourtChange(matchIds: string[], courtName: string, eventId: string) {
  if (matchIds.length === 0) return
  const adminSupabase = getAdminClient()
  const { data: matches } = await adminSupabase
    .from('matches')
    .select('player_a1, player_a2, player_b1, player_b2')
    .in('id', matchIds)
  const ids = new Set<string>()
  matches?.forEach(m => [m.player_a1, m.player_a2, m.player_b1, m.player_b2].forEach(id => ids.add(id)))
  if (ids.size === 0) return
  const { data: profiles } = await adminSupabase.from('profiles').select('id').in('id', [...ids]).eq('is_guest', false)
  sendPushToUsers((profiles ?? []).map(p => p.id), {
    title: 'Cambio de pista',
    body: `Tu partido se juega ahora en ${courtName}`,
    url: `/events/${eventId}`,
  }).catch(console.error)
}

// Moves matches to another court of the event's club, in situ (the club had a problem with a court).
// `matchId` only changes that match; without it, every match of `courtNumber` in the event changes
// (all rounds). Confirmed matches keep their court: it is part of the history.
export async function changeCourt(
  eventId: string,
  courtId: string,
  target: { matchId: string } | { courtNumber: number }
): Promise<CourtChange> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { success: false, error: 'Requiere admin' }

  const adminSupabase = getAdminClient()

  const { data: event } = await adminSupabase.from('events').select('club_id, status').eq('id', eventId).single()
  if (!event || event.status !== 'in_progress') return { success: false, error: 'El sorteo de este evento no está publicado' }

  const { data: court } = await adminSupabase.from('courts').select('name, club_id').eq('id', courtId).single()
  if (!court || court.club_id !== event.club_id) return { success: false, error: 'Esa pista no pertenece al club del evento' }

  let query = adminSupabase
    .from('matches')
    .update({ court_id: courtId, court_name: court.name })
    .eq('event_id', eventId)
    .neq('status', 'confirmed')
  query = 'matchId' in target ? query.eq('id', target.matchId) : query.eq('court_number', target.courtNumber)

  const { data: changed, error } = await query.select('id')
  if (error) return { success: false, error: error.message }
  if (!changed || changed.length === 0) return { success: false, error: 'No hay partidos que cambiar (los ya confirmados no se tocan)' }

  await notifyCourtChange(changed.map(m => m.id), court.name, eventId)

  revalidatePath('/')
  revalidatePath(`/events/${eventId}`)
  revalidatePath('/admin/matches')
  return { success: true }
}

// Assigns a court of the event's club to every match of that court number in the event.
export async function assignCourt(eventId: string, courtNumber: number, courtId: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { success: false, error: 'Requiere admin' }

  const adminSupabase = getAdminClient()

  let courtName: string | null = null
  if (courtId) {
    const { data: court } = await adminSupabase.from('courts').select('name').eq('id', courtId).single()
    if (!court) return { success: false, error: 'La pista no existe' }
    courtName = court.name
  }

  const { error } = await adminSupabase
    .from('matches')
    .update({ court_id: courtId, court_name: courtName })
    .eq('event_id', eventId)
    .eq('court_number', courtNumber)

  if (error) return { success: false, error: error.message }

  revalidatePath('/')
  revalidatePath(`/events/${eventId}`)
  revalidatePath('/admin/matches')
  return { success: true }
}
