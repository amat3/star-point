'use server'

import { createClient } from '@/utils/supabase/server'
import { getAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { MixingEvent } from '@/types/events'
import { sendPushToUser } from '@/lib/push'

const MAX_RESERVES = 6

export async function getOpenEvents(): Promise<MixingEvent[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  // Fetch events
  const { data: events, error } = await supabase
    .from('events')
    .select(`
        id,
        title,
        start_time,
        max_spots,
        rounds,
        duration_minutes,
        status,
        created_by,
        is_test
    `)
    .eq('status', 'open')
    .order('start_time', { ascending: true })

  if (error || !events) {
    console.error('Error fetching events:', error)
    return []
  }

  // Optimize: Fetch all participants for these events in one go or keep loop if volume is low.
  // Given low volume of open events (usually < 10), loop is fine for now.

  // Fetch participation counts and user status
  // Note: simpler to do effectively separate queries or joins if Supabase allowed clean relations
  // For now, we'll iterate or separate query. 
  // Optimization: Select count of participants for each event
  
  // Optimize: Select count of participants for each event
  const eventsWithInfo = await Promise.all(events.map(async (event) => {
    // Fetch participants raw (separate query to avoid join issues)
    const { data: rawParticipants } = await supabase
      .from('event_participants')
      .select('user_id, joined_at')
      .eq('event_id', event.id)
      .order('joined_at', { ascending: true })
      
    // Fetch profiles for these participants
    type ParticipantProfile = { id: string; full_name?: string | null; avatar_url?: string | null; is_guest?: boolean }
    const userIds = rawParticipants?.map((p) => p.user_id) || []
    const profilesMap: Record<string, ParticipantProfile> = {}

    if (userIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, is_guest')
            .in('id', userIds)

        profiles?.forEach((p) => {
            profilesMap[p.id] = p
        })
    }

    // Check if user joined
    const isJoined = userIds.includes(user.id)

    const formattedParticipants = rawParticipants?.map((p) => ({
        user_id: p.user_id,
        full_name: profilesMap[p.user_id]?.full_name || 'Jugador',
        avatar_url: profilesMap[p.user_id]?.avatar_url,
        is_guest: profilesMap[p.user_id]?.is_guest ?? false
    })) || []

    return {
      ...event,
      rounds: event.rounds || 1,
      duration_minutes: event.duration_minutes || 90,
      is_test: event.is_test ?? false,
      participants_count: rawParticipants?.length || 0,
      participants: formattedParticipants,
      is_joined: isJoined
    } as MixingEvent
  }))

  return eventsWithInfo
}

export async function joinEvent(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  // Check limits and status
  const { data: event } = await supabase.from('events').select('max_spots, status').eq('id', eventId).single()
  
  if (!event || event.status !== 'open') {
    throw new Error("El evento no está disponible")
  }

  const { count } = await supabase
      .from('event_participants')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
  
  if ((count || 0) >= (event.max_spots + MAX_RESERVES)) {
    throw new Error("Evento completo (incluso reservas)")
  }

  const { error } = await supabase
    .from('event_participants')
    .insert({ event_id: eventId, user_id: user.id })

  if (error) throw error instanceof Error ? error : new Error(String(error))

  revalidatePath('/dashboard')
  return { success: true }
}

export async function leaveEvent(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  const { data: event } = await supabase.from('events').select('status').eq('id', eventId).single()
  if (!event || event.status !== 'open') {
    throw new Error('No puedes abandonar un evento que ya ha comenzado')
  }

  const { data: promotion, error } = await supabase.rpc('leave_event_atomic', {
    p_event_id: eventId,
    p_user_id: user.id,
  })

  if (error) throw error instanceof Error ? error : new Error(String(error))

  if (promotion?.promoted_user_id) {
    sendPushToUser(promotion.promoted_user_id, {
      title: '¡Pasas a titular!',
      body: `Has pasado a titular en "${promotion.promoted_event_title}"`,
      url: `/events/${promotion.promoted_event_id}`,
    }).catch(console.error)
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function createEvent(data: { title: string, start_time: string, max_spots: number, rounds: number, duration_minutes: number, is_test?: boolean }) {
  try {
    const supabase = await createClient()
    
    // Check Admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        throw new Error("Usuario no autenticado")
    }

    const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    
    if (profileError) {
        throw new Error("Error al verificar permisos")
    }
    
    if (profile?.role !== 'admin') {
        throw new Error("Permisos insuficientes: Requiere rol de admin")
    }

    const { error } = await supabase
      .from('events')
      .insert({
        title: data.title,
        start_time: data.start_time,
        max_spots: data.max_spots,
        rounds: data.rounds,
        duration_minutes: data.duration_minutes,
        created_by: user.id,
        status: 'open',
        is_test: data.is_test ?? false,
      })

    if (error) {
        throw new Error(`Error al crear evento: ${error.message}`)
    }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    throw error instanceof Error ? error : new Error("Error interno del servidor")
  }
}


export async function updateEvent(eventId: string, data: { title: string, start_time: string, max_spots: number, rounds: number, duration_minutes: number }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') throw new Error("Requiere admin")

    const { error } = await supabase
      .from('events')
      .update({
        title: data.title,
        start_time: data.start_time,
        max_spots: data.max_spots,
        rounds: data.rounds,
        duration_minutes: data.duration_minutes
      })
      .eq('id', eventId)

    if (error) throw error instanceof Error ? error : new Error(String(error))

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error))
  }
}

export async function deleteEvent(eventId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') throw new Error("Requiere admin")

    // Bloquear si hay partidos con ELO ya aplicado
    const { count: confirmedCount } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'confirmed')

    if ((confirmedCount || 0) > 0) {
      throw new Error('No se puede eliminar un evento con partidos ya confirmados')
    }

    // Borrar partidos pendientes, luego participantes, luego el evento
    await supabase.from('matches').delete().eq('event_id', eventId)
    await supabase.from('event_participants').delete().eq('event_id', eventId)

    const { error } = await supabase.from('events').delete().eq('id', eventId)
    if (error) throw error instanceof Error ? error : new Error(String(error))

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error))
  }
}

export async function removeParticipant(eventId: string, userId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Check Admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') throw new Error("Requiere admin")

    const adminSupabase = getAdminClient()

    // Check if the participant is a guest — if so, delete their profile too
    const { data: targetProfile } = await adminSupabase
      .from('profiles')
      .select('is_guest')
      .eq('id', userId)
      .single()

    const { data: promotion, error } = await supabase.rpc('leave_event_atomic', {
      p_event_id: eventId,
      p_user_id: userId,
    })

    if (error) throw error instanceof Error ? error : new Error(String(error))

    if (promotion?.promoted_user_id) {
      sendPushToUser(promotion.promoted_user_id, {
        title: '¡Pasas a titular!',
        body: `Has pasado a titular en "${promotion.promoted_event_title}"`,
        url: `/events/${promotion.promoted_event_id}`,
      }).catch(console.error)
    }

    if (targetProfile?.is_guest) {
      await adminSupabase.auth.admin.deleteUser(userId)
    }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error))
  }
}

export async function closeEventWithGuests(eventId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') throw new Error("Requiere admin")

    const { data: event } = await supabase.from('events').select('status, max_spots').eq('id', eventId).single()
    if (!event || event.status !== 'open') throw new Error("El evento no está disponible")

    const { count: currentCount } = await supabase
      .from('event_participants')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)

    const missing = event.max_spots - (currentCount || 0)

    if (missing <= 0) throw new Error("El evento ya está completo")
    if (missing > MAX_RESERVES) throw new Error(`Faltan ${missing} jugadores. Solo se pueden añadir hasta ${MAX_RESERVES} invitados`)

    const adminSupabase = getAdminClient()

    for (let i = 1; i <= missing; i++) {
      const guestEmail = `invitado-${crypto.randomUUID()}@guest.local`

      // Create real auth user (guest can never log in — random password)
      const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email: guestEmail,
        password: crypto.randomUUID(),
        email_confirm: true
      })

      if (authError || !authData.user) throw new Error(authError?.message || 'Error creando auth invitado')

      const guestId = authData.user.id

      // The trigger on_auth_user_created already created the profile row.
      // We just update it with guest-specific fields.
      const { error: profileError } = await adminSupabase
        .from('profiles')
        .update({ full_name: `Invitado ${i}`, rating: 3.5, role: 'player', is_guest: true, matches_played: 0, matches_won: 0, win_ratio: 0 })
        .eq('id', guestId)

      if (profileError) {
        await adminSupabase.auth.admin.deleteUser(guestId)
        throw new Error(profileError.message)
      }

      const { error: participantError } = await adminSupabase
        .from('event_participants')
        .insert({ event_id: eventId, user_id: guestId })

      if (participantError) {
        await adminSupabase.auth.admin.deleteUser(guestId)
        throw new Error(participantError.message)
      }
    }

    revalidatePath('/dashboard')
    return { success: true, added: missing }
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error))
  }
}

export async function addParticipant(eventId: string, userId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') throw new Error("Requiere admin")

    const { data: event } = await supabase.from('events').select('status').eq('id', eventId).single()
    if (!event || event.status !== 'open') throw new Error("El evento no está abierto")

    const { count } = await supabase
      .from('event_participants')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('user_id', userId)
    if ((count ?? 0) > 0) throw new Error("El jugador ya está apuntado")

    const adminSupabase = getAdminClient()
    const { error } = await adminSupabase
      .from('event_participants')
      .insert({ event_id: eventId, user_id: userId })

    if (error) throw new Error(error.message)

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error))
  }
}
