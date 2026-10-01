'use server'

import { createClient } from '@/utils/supabase/server'
import { getAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

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
