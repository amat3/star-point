'use server'

import { createClient } from '@/utils/supabase/server'
import { getAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { MixingEvent } from '@/types/events'
import { sendPushToUsers, TEST_PUSH_AUDIENCE } from '@/lib/push'
import { MAX_RESERVES } from '@/lib/event-capacity'
import { MATCH_DURATION_MINUTES, MATCH_MAX_NEEDED, MATCH_NOTES_MAX, MATCH_TITLE, isMatchExpired, spotsForNeeded } from '@/lib/match-events'


// Un evento in_progress deja de mostrarse en cuanto TODOS sus partidos están
// confirmados — no hay ningún estado 'finished' en BD, se calcula al vuelo.
export async function isEventFullyConfirmed(eventId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: matches } = await supabase.from('matches').select('status').eq('event_id', eventId)
  if (!matches || matches.length === 0) return false
  return matches.every(m => m.status === 'confirmed')
}

// Supabase types an embedded to-one relation as an array; normalize to a single object.
function firstClub(club: unknown): { name: string } | null {
  const c = Array.isArray(club) ? club[0] : club
  return c ? { name: (c as { name: string }).name } : null
}

export type PublicEvent = Pick<MixingEvent, 'id' | 'title' | 'club' | 'start_time' | 'max_spots' | 'duration_minutes' | 'status' | 'kind'> & {
  participants_count: number
}

// Para visitantes sin sesión: solo datos no sensibles (nada de nombres ni de
// quién está apuntado, solo cuántos). Únicamente eventos con inscripción abierta.
export async function getPublicEvents(): Promise<PublicEvent[]> {
  const supabase = await createClient()

  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, start_time, max_spots, duration_minutes, status, kind, club:clubs(name)')
    .eq('status', 'open')
    .eq('is_test', false)
    .order('start_time', { ascending: true })

  if (error || !events || events.length === 0) return []

  const { data: participants } = await supabase
    .from('event_participants')
    .select('event_id')
    .in('event_id', events.map(e => e.id))

  const counts: Record<string, number> = {}
  participants?.forEach(p => { counts[p.event_id] = (counts[p.event_id] ?? 0) + 1 })

  return events
    .filter(e => e.kind !== 'match' || !isMatchExpired(e.start_time))
    .map(e => ({
      ...e,
      club: firstClub(e.club),
      duration_minutes: e.duration_minutes || 90,
      participants_count: counts[e.id] ?? 0,
    })) as PublicEvent[]
}

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
        is_test,
        kind,
        club_id,
        club:clubs(name)
    `)
    .in('status', ['open', 'in_progress'])
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
      club: firstClub(event.club),
      rounds: event.rounds || 1,
      duration_minutes: event.duration_minutes || 90,
      is_test: event.is_test ?? false,
      participants_count: rawParticipants?.length || 0,
      participants: formattedParticipants,
      is_joined: isJoined
    } as MixingEvent
  }))

  // Los eventos in_progress con todos sus partidos ya confirmados dejan de mostrarse
  const visibleEvents = await Promise.all(eventsWithInfo.map(async (event) => {
    if (event.status !== 'in_progress') return event
    const fullyConfirmed = await isEventFullyConfirmed(event.id)
    return fullyConfirmed ? null : event
  }))

  return visibleEvents.filter((e): e is MixingEvent => e !== null && (e.kind !== 'match' || !isMatchExpired(e.start_time)))
}

export async function joinEvent(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  // Check limits and status
  const { data: event } = await supabase.from('events').select('max_spots, status, kind, start_time').eq('id', eventId).single()
  
  if (!event || event.status !== 'open') {
    throw new Error("El evento no está disponible")
  }

  const isMatch = event.kind === 'match'
  if (isMatch && isMatchExpired(event.start_time)) {
    throw new Error('Este partido ya ha terminado')
  }

  const { count } = await supabase
      .from('event_participants')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)

  // Matches have no waiting list: when the spots are taken, it is full
  const limit = isMatch ? event.max_spots : event.max_spots + MAX_RESERVES
  if ((count || 0) >= limit) {
    throw new Error(isMatch ? 'El partido ya está completo' : 'Evento completo (incluso reservas)')
  }

  const { error } = await supabase
    .from('event_participants')
    .insert({ event_id: eventId, user_id: user.id })

  if (error) throw error instanceof Error ? error : new Error(String(error))

  // Two people joining at the same moment can both pass the check above: keep the
  // first ones by sign-up order and take this one back out if it ended up in excess.
  if (isMatch) {
    const { data: ordered } = await supabase
      .from('event_participants')
      .select('user_id')
      .eq('event_id', eventId)
      .order('joined_at', { ascending: true })
    const position = (ordered ?? []).findIndex(p => p.user_id === user.id)
    if (position >= event.max_spots) {
      await supabase.from('event_participants').delete().eq('event_id', eventId).eq('user_id', user.id)
      throw new Error('El partido se ha completado justo antes que tú')
    }
  }

  revalidatePath('/')
  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

export async function leaveEvent(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  const { data: event } = await supabase.from('events').select('status, is_test, kind, created_by').eq('id', eventId).single()
  if (!event || event.status !== 'open') {
    throw new Error('No puedes abandonar un evento que ya ha comenzado')
  }
  if (event.kind === 'match' && event.created_by === user.id) {
    throw new Error('Organizas este partido: cancélalo si no vas a poder jugar')
  }

  const { data: promotion, error } = await supabase.rpc('leave_event_atomic', {
    p_event_id: eventId,
    p_user_id: user.id,
  })

  if (error) throw error instanceof Error ? error : new Error(String(error))

  if (promotion?.promoted_user_id) {
    const recipients = event.is_test ? TEST_PUSH_AUDIENCE : [promotion.promoted_user_id]
    sendPushToUsers(recipients, {
      title: '¡Pasas a titular!',
      body: `Has pasado a titular en "${promotion.promoted_event_title}"`,
      url: `/events/${promotion.promoted_event_id}`,
    }).catch(console.error)
  }

  revalidatePath('/')
  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

export async function createEvent(data: { title: string, start_time: string, max_spots: number, rounds: number, duration_minutes: number, is_test?: boolean, club_id?: string | null }) {
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

    const { data: newEvent, error } = await supabase
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
        club_id: data.club_id ?? null,
      })
      .select('id, title, start_time')
      .single()

    if (error) {
        throw new Error(`Error al crear evento: ${error.message}`)
    }

    let playerIds: string[]
    if (data.is_test) {
      playerIds = TEST_PUSH_AUDIENCE
    } else {
      const adminSupabase = getAdminClient()
      const { data: players } = await adminSupabase
        .from('profiles')
        .select('id')
        .eq('is_guest', false)
      playerIds = (players ?? []).map((p) => p.id)
    }

    const formattedDate = new Intl.DateTimeFormat('es-ES', {
      timeZone: 'Europe/Madrid',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(newEvent.start_time))

    sendPushToUsers(playerIds, {
      title: 'Nuevo evento disponible',
      body: `"${newEvent.title}" el ${formattedDate} — ¡apúntate!`,
      url: '/',
    }).catch(console.error)

    revalidatePath('/')
    revalidatePath('/mixing')
    return { success: true }
  } catch (error) {
    throw error instanceof Error ? error : new Error("Error interno del servidor")
  }
}


export async function updateEvent(eventId: string, data: { title: string, start_time: string, max_spots: number, rounds: number, duration_minutes: number, club_id?: string | null }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') throw new Error("Requiere admin")

    const { data: existingEvent } = await supabase
      .from('events')
      .select('status, max_spots, rounds, club_id')
      .eq('id', eventId)
      .single()
    const published = existingEvent?.status === 'in_progress'
    if (existingEvent?.status !== 'open' && !published) throw new Error('Este evento ya no se puede editar')

    // With the draw published, changing courts, rounds or club invalidates it:
    // the draw is undone (back to sign-up) so it can be generated again.
    let reopened = false
    if (published) {
      const structural =
        data.max_spots !== existingEvent.max_spots ||
        data.rounds !== existingEvent.rounds ||
        (data.club_id !== undefined && data.club_id !== existingEvent.club_id)

      if (structural) {
        const { count: played } = await supabase
          .from('matches')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .or('status.neq.pending,score_details.neq.0-0')
        if ((played ?? 0) > 0) throw new Error('Ya hay resultados introducidos: no se pueden cambiar pistas, rondas ni club')

        const { error: matchesError } = await getAdminClient().from('matches').delete().eq('event_id', eventId)
        if (matchesError) throw new Error(matchesError.message)
        reopened = true
      }
    }

    const { error } = await supabase
      .from('events')
      .update({
        title: data.title,
        start_time: data.start_time,
        duration_minutes: data.duration_minutes,
        ...(published && !reopened
          ? {}
          : {
              max_spots: data.max_spots,
              rounds: data.rounds,
              // undefined leaves the club untouched; null clears it
              ...(data.club_id !== undefined ? { club_id: data.club_id } : {}),
              ...(reopened ? { status: 'open' } : {}),
            }),
      })
      .eq('id', eventId)

    if (error) throw error instanceof Error ? error : new Error(String(error))

    revalidatePath('/')
    revalidatePath('/mixing')
    revalidatePath(`/events/${eventId}`)
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

    const { data: existingEvent } = await supabase.from('events').select('status').eq('id', eventId).single()
    if (existingEvent?.status !== 'open' && existingEvent?.status !== 'in_progress') throw new Error('Este evento ya no se puede anular')

    // Bloquear si hay partidos con ELO ya aplicado
    const { count: confirmedCount } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'confirmed')

    if ((confirmedCount || 0) > 0) {
      throw new Error('No se puede anular un evento con partidos ya confirmados')
    }

    // Borrar partidos pendientes, luego participantes, luego el evento
    // matches has no DELETE policy for users: the admin was verified above
    const { error: matchesError } = await getAdminClient().from('matches').delete().eq('event_id', eventId)
    if (matchesError) throw new Error(matchesError.message)
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

    const { data: existingEvent } = await supabase.from('events').select('status').eq('id', eventId).single()
    if (existingEvent?.status !== 'open') throw new Error('No se puede quitar a un jugador con los partidos ya en marcha')

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
      const { data: eventInfo } = await supabase.from('events').select('is_test').eq('id', eventId).single()
      const recipients = eventInfo?.is_test ? TEST_PUSH_AUDIENCE : [promotion.promoted_user_id]
      sendPushToUsers(recipients, {
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

export async function addGuestToEvent(eventId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') throw new Error("Requiere admin")

    const { data: event } = await supabase.from('events').select('status').eq('id', eventId).single()
    if (!event || event.status !== 'open') throw new Error("El evento no está disponible")

    const adminSupabase = getAdminClient()

    // Contar invitados ya presentes para numerar sin duplicar "Invitado 1"
    // si se añaden varios de uno en uno.
    const { data: participantIds } = await adminSupabase
      .from('event_participants')
      .select('user_id')
      .eq('event_id', eventId)

    let existingGuestCount = 0
    if (participantIds && participantIds.length > 0) {
      const { count } = await adminSupabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .in('id', participantIds.map(p => p.user_id))
        .eq('is_guest', true)
      existingGuestCount = count || 0
    }

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
      .update({ full_name: `Invitado ${existingGuestCount + 1}`, rating: 3.5, role: 'player', is_guest: true, matches_played: 0, matches_won: 0, win_ratio: 0 })
      .eq('id', guestId)

    if (profileError) {
      await adminSupabase.auth.admin.deleteUser(guestId)
      throw new Error(profileError.message)
    }

    // Sin fijar joined_at: cae al final de la cola por el default now() de la
    // columna, así que ocupa el siguiente hueco libre (titular o reserva)
    // según corresponda, sin desplazar a nadie ya apuntado.
    const { error: participantError } = await adminSupabase
      .from('event_participants')
      .insert({ event_id: eventId, user_id: guestId })

    if (participantError) {
      await adminSupabase.auth.admin.deleteUser(guestId)
      throw new Error(participantError.message)
    }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error))
  }
}

export async function renameGuest(guestId: string, newName: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') throw new Error("Requiere admin")

    const trimmedName = newName.trim()
    if (trimmedName.length < 2) throw new Error("El nombre debe tener al menos 2 caracteres")

    const adminSupabase = getAdminClient()

    // Solo se puede renombrar a invitados, nunca a jugadores reales
    const { data: target } = await adminSupabase.from('profiles').select('is_guest').eq('id', guestId).single()
    if (!target?.is_guest) throw new Error("Solo se puede editar el nombre de invitados")

    const { error } = await adminSupabase.from('profiles').update({ full_name: trimmedName }).eq('id', guestId)
    if (error) throw new Error(error.message)

    revalidatePath('/dashboard')
    return { success: true }
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

// ---------------------------------------------------------------------------
// Partidos: events a player publishes to look for players
// ---------------------------------------------------------------------------

type MatchInput = { start_time: string; club_id: string; needed: number; notes?: string }

function validateMatchInput(input: MatchInput) {
  if (!Number.isInteger(input.needed) || input.needed < 1 || input.needed > MATCH_MAX_NEEDED) {
    throw new Error('Indica cuántos jugadores buscas (1, 2 o 3)')
  }
  if (!input.club_id) throw new Error('Elige un club')
  const start = new Date(input.start_time).getTime()
  if (isNaN(start)) throw new Error('Fecha u hora no válidas')
  if (start <= Date.now()) throw new Error('El partido tiene que ser en el futuro')
  if ((input.notes ?? '').trim().length > MATCH_NOTES_MAX) throw new Error(`El comentario admite como máximo ${MATCH_NOTES_MAX} caracteres`)
}

const cleanNotes = (notes?: string) => notes?.trim() || null

function formatMatchWhen(startTime: string) {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(startTime))
}

/** Organizer or admin of a published match; throws otherwise. */
async function getManageableMatch(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: event } = await supabase
    .from('events')
    .select('id, kind, status, created_by, start_time, max_spots, club_id')
    .eq('id', eventId)
    .single()
  if (!event || event.kind !== 'match') throw new Error('Partido no encontrado')
  if (event.status !== 'open') throw new Error('Este partido ya no se puede modificar')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (event.created_by !== user.id && profile?.role !== 'admin') {
    throw new Error('Solo quien organiza el partido (o un admin) puede hacerlo')
  }
  return { user, event }
}

export async function createMatchEvent(input: MatchInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  validateMatchInput(input)

  // Players cannot insert events directly (admin-only policy): validated above, written as admin
  const admin = getAdminClient()

  const { data: club } = await admin.from('clubs').select('id, name').eq('id', input.club_id).single()
  if (!club) throw new Error('El club no existe')

  const { data: event, error } = await admin
    .from('events')
    .insert({
      title: MATCH_TITLE,
      start_time: input.start_time,
      max_spots: spotsForNeeded(input.needed),
      rounds: 1,
      duration_minutes: MATCH_DURATION_MINUTES,
      created_by: user.id,
      status: 'open',
      is_test: false,
      kind: 'match',
      club_id: club.id,
      notes: cleanNotes(input.notes),
    })
    .select('id, start_time')
    .single()
  if (error || !event) throw new Error(`Error al publicar el partido: ${error?.message ?? 'desconocido'}`)

  // The organizer takes the first spot
  const { error: joinError } = await admin.from('event_participants').insert({ event_id: event.id, user_id: user.id })
  if (joinError) {
    await admin.from('events').delete().eq('id', event.id)
    throw new Error(`Error al publicar el partido: ${joinError.message}`)
  }

  // Push to the whole group, except whoever published it
  const { data: players } = await admin.from('profiles').select('id').eq('is_guest', false).neq('id', user.id)
  sendPushToUsers((players ?? []).map(p => p.id), {
    title: 'Nuevo partido',
    body: `${input.needed === 1 ? 'Falta 1 jugador' : `Faltan ${input.needed} jugadores`} · ${formatMatchWhen(event.start_time)} · ${club.name}`,
    url: `/events/${event.id}`,
  }).catch(console.error)

  revalidatePath('/')
  return { id: event.id as string }
}

export async function updateMatchEvent(eventId: string, input: MatchInput) {
  const { event } = await getManageableMatch(eventId)
  validateMatchInput(input)

  const admin = getAdminClient()

  const { count } = await admin.from('event_participants').select('*', { count: 'exact', head: true }).eq('event_id', eventId)
  const maxSpots = spotsForNeeded(input.needed)
  if ((count ?? 0) > maxSpots) {
    throw new Error(`Ya hay ${count} jugadores apuntados: no puedes buscar tan pocos`)
  }

  const { error } = await admin
    .from('events')
    .update({ start_time: input.start_time, club_id: input.club_id, max_spots: maxSpots, notes: cleanNotes(input.notes) })
    .eq('id', eventId)
  if (error) throw new Error(error.message)

  // Tell the other players if when or where changed
  const changedPlace = event.club_id !== input.club_id
  const changedTime = new Date(event.start_time).getTime() !== new Date(input.start_time).getTime()
  if (changedPlace || changedTime) {
    const { data: joined } = await admin.from('event_participants').select('user_id').eq('event_id', eventId)
    const { data: club } = await admin.from('clubs').select('name').eq('id', input.club_id).single()
    sendPushToUsers(
      (joined ?? []).map(p => p.user_id).filter(id => id !== event.created_by),
      {
        title: 'Partido actualizado',
        body: `${formatMatchWhen(input.start_time)}${club ? ` · ${club.name}` : ''}`,
        url: `/events/${eventId}`,
      }
    ).catch(console.error)
  }

  revalidatePath('/')
  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

export async function cancelMatchEvent(eventId: string) {
  const { user, event } = await getManageableMatch(eventId)
  const admin = getAdminClient()

  const { data: joined } = await admin.from('event_participants').select('user_id').eq('event_id', eventId)

  await admin.from('event_participants').delete().eq('event_id', eventId)
  const { error } = await admin.from('events').delete().eq('id', eventId)
  if (error) throw new Error(error.message)

  sendPushToUsers(
    (joined ?? []).map(p => p.user_id).filter(id => id !== user.id),
    { title: 'Partido cancelado', body: `Se ha cancelado el partido de ${formatMatchWhen(event.start_time)}`, url: '/' }
  ).catch(console.error)

  revalidatePath('/')
  return { success: true }
}

// Takes a published draw back to the sign-up phase so courts, rounds and players
// can be changed and the draw generated again. Only while no result exists.
export async function reopenDraw(eventId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') throw new Error("Requiere admin")

    const { data: event } = await supabase.from('events').select('status').eq('id', eventId).single()
    if (event?.status !== 'in_progress') throw new Error('Este evento no tiene el sorteo publicado')

    const { count: played } = await supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .or('status.neq.pending,score_details.neq.0-0')
    if ((played ?? 0) > 0) throw new Error('Ya hay resultados introducidos: no se puede rehacer el sorteo')

    const { error: matchesError } = await getAdminClient().from('matches').delete().eq('event_id', eventId)
    if (matchesError) throw new Error(matchesError.message)

    const { error } = await supabase.from('events').update({ status: 'open' }).eq('id', eventId)
    if (error) throw new Error(error.message)

    revalidatePath('/')
    revalidatePath('/mixing')
    revalidatePath(`/events/${eventId}`)
    return { success: true }
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error))
  }
}

// A player from outside the group, added by whoever organizes the match (or an admin).
// It is a guest profile (it can never log in), named by the organizer.
export async function addGuestToMatch(eventId: string, name: string) {
  const { event } = await getManageableMatch(eventId)

  const guestName = name.trim()
  if (guestName.length < 2) throw new Error('El nombre debe tener al menos 2 caracteres')
  if (guestName.length > 40) throw new Error('El nombre es demasiado largo')

  const admin = getAdminClient()

  const { count } = await admin.from('event_participants').select('*', { count: 'exact', head: true }).eq('event_id', eventId)
  if ((count ?? 0) >= event.max_spots) throw new Error('El partido ya está completo')

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: `invitado-${crypto.randomUUID()}@guest.local`,
    password: crypto.randomUUID(),
    email_confirm: true,
  })
  if (authError || !authData.user) throw new Error(authError?.message || 'Error creando el invitado')
  const guestId = authData.user.id

  // The auth trigger already created the profile row: mark it as a guest
  const { error: profileError } = await admin
    .from('profiles')
    .update({ full_name: guestName, rating: 3.5, role: 'player', is_guest: true, matches_played: 0, matches_won: 0, win_ratio: 0 })
    .eq('id', guestId)
  if (profileError) {
    await admin.auth.admin.deleteUser(guestId)
    throw new Error(profileError.message)
  }

  const { error: joinError } = await admin.from('event_participants').insert({ event_id: eventId, user_id: guestId })
  if (joinError) {
    await admin.auth.admin.deleteUser(guestId)
    throw new Error(joinError.message)
  }

  revalidatePath('/')
  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

// Removes a guest the organizer added; real players leave by themselves.
export async function removeGuestFromMatch(eventId: string, guestId: string) {
  await getManageableMatch(eventId)

  const admin = getAdminClient()

  const { data: guest } = await admin.from('profiles').select('is_guest').eq('id', guestId).single()
  if (!guest?.is_guest) throw new Error('Solo se pueden quitar invitados')

  const { data: removed, error } = await admin
    .from('event_participants')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', guestId)
    .select('user_id')
  if (error) throw new Error(error.message)
  if (!removed?.length) throw new Error('Ese invitado no está en el partido')

  // The guest only existed for this match
  await admin.auth.admin.deleteUser(guestId)

  revalidatePath('/')
  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

// Renames a guest the organizer added to the match.
export async function renameMatchGuest(eventId: string, guestId: string, name: string) {
  await getManageableMatch(eventId)

  const guestName = name.trim()
  if (guestName.length < 2) throw new Error('El nombre debe tener al menos 2 caracteres')
  if (guestName.length > 40) throw new Error('El nombre es demasiado largo')

  const admin = getAdminClient()

  const { data: inMatch } = await admin
    .from('event_participants')
    .select('user_id, profiles!inner(is_guest)')
    .eq('event_id', eventId)
    .eq('user_id', guestId)
    .eq('profiles.is_guest', true)
    .maybeSingle()
  if (!inMatch) throw new Error('Solo se puede cambiar el nombre de invitados de este partido')

  const { error } = await admin.from('profiles').update({ full_name: guestName }).eq('id', guestId)
  if (error) throw new Error(error.message)

  revalidatePath('/')
  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

// Names the organizer's already-settled players (the "confirmed" rows of a match).
// `index` is the position among them; an empty name clears it.
export async function setMatchKnownPlayer(eventId: string, index: number, name: string) {
  const { event } = await getManageableMatch(eventId)

  const known = Math.max(4 - event.max_spots, 0)
  if (!Number.isInteger(index) || index < 0 || index >= known) throw new Error('Ese puesto no existe')

  const playerName = name.trim()
  if (playerName.length > 40) throw new Error('El nombre es demasiado largo')
  if (playerName.length > 0 && playerName.length < 2) throw new Error('El nombre debe tener al menos 2 caracteres')

  const admin = getAdminClient()
  const { data: current } = await admin.from('events').select('known_players').eq('id', eventId).single()

  const names: string[] = Array.from({ length: known }, (_, i) => (current?.known_players as string[] | null)?.[i] ?? '')
  names[index] = playerName

  const { error } = await admin.from('events').update({ known_players: names }).eq('id', eventId)
  if (error) throw new Error(error.message)

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}
