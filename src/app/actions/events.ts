'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { MixingEvent, EventParticipant } from '@/types/events'

export async function getOpenEvents(): Promise<MixingEvent[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  // Fetch events
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
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
    const userIds = rawParticipants?.map((p: any) => p.user_id) || []
    let profilesMap: Record<string, any> = {}
    
    if (userIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds)
            
        profiles?.forEach((p: any) => {
            profilesMap[p.id] = p
        })
    }

    // Check if user joined
    const isJoined = userIds.includes(user.id)

    const formattedParticipants = rawParticipants?.map((p: any) => ({
        user_id: p.user_id,
        full_name: profilesMap[p.user_id]?.full_name || 'Jugador',
        avatar_url: profilesMap[p.user_id]?.avatar_url
    })) || []

    return {
      ...event,
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
  
  const MAX_RESERVES = 4
  
  if ((count || 0) >= (event.max_spots + MAX_RESERVES)) {
    throw new Error("Evento completo (incluso reservas)")
  }

  const { error } = await supabase
    .from('event_participants')
    .insert({ event_id: eventId, user_id: user.id })

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  return { success: true }
}

export async function leaveEvent(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from('event_participants')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  return { success: true }
}

export async function createEvent(data: { title: string, start_time: string, max_spots: number }) {
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
        created_by: user.id,
        status: 'open'
      })

    if (error) {
        throw new Error(`Error al crear evento: ${error.message}`)
    }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    throw new Error(error.message || "Error interno del servidor")
  }
}

export async function getEventParticipants(eventId: string): Promise<EventParticipant[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('event_participants')
    .select(`
      *,
      profile:profiles(full_name, avatar_url)
    `)
    .eq('event_id', eventId)
    .order('joined_at', { ascending: true })

  if (error) {
    console.error(error)
    return []
  }

  return data as unknown as EventParticipant[]
}

export async function updateEvent(eventId: string, data: { title: string, start_time: string, max_spots: number }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Check Admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') throw new Error("Requiere admin")

    const { error } = await supabase
      .from('events')
      .update({
        title: data.title,
        start_time: data.start_time,
        max_spots: data.max_spots
      })
      .eq('id', eventId)

    if (error) throw new Error(error.message)

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    throw new Error(error.message)
  }
}

export async function deleteEvent(eventId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Check Admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') throw new Error("Requiere admin")

    // Delete event
    await supabase.from('event_participants').delete().eq('event_id', eventId)
    
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)

    if (error) throw new Error(error.message)

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    throw new Error(error.message)
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

    const { error } = await supabase
      .from('event_participants')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId)

    if (error) throw new Error(error.message)

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    throw new Error(error.message)
  }
}
