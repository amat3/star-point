import { createClient } from '@/utils/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { RealtimeRefresher } from '@/components/dashboard/RealtimeRefresher'
import { NotificationListener } from '@/components/dashboard/NotificationListener'
import { MixingEvent } from '@/types/events'
import { isEventFullyConfirmed } from '@/app/actions/events'
import Header from '@/components/molecules/Header'
import TabBar from '@/components/molecules/TabBar'
import EventOpenView from '@/components/organisms/EventOpenView'
import EventDrawView from '@/components/organisms/EventDrawView'
import MatchEventView from '@/components/organisms/MatchEventView'
import { isMatchExpired } from '@/lib/match-events'
import { getEventDraw } from '@/lib/event-draw'
import { isAdminView } from '@/lib/view-mode'
import { formatEventChip, formatEventDate, formatEventTime, formatEventWeekday, formatLevel, formatWeekdayPlural, toTitleCase } from '@/lib/utils'

interface EventPageProps {
  params: Promise<{ id: string }>
}

export default async function EventPage(props: EventPageProps) {
  const params = await props.params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect(`/login?next=/events/${params.id}`)

  // 1. Fetch Event
  const { data: event, error } = await supabase
    .from('events')
    .select('*, club:clubs(name)')
    .eq('id', params.id)
    .single()

  if (error || !event) {
    notFound()
  }

  // Un evento in_progress con todos sus partidos ya confirmados ha terminado
  // del todo — deja de ser accesible, igual que en el listado del dashboard.
  if (event.status === 'in_progress' && await isEventFullyConfirmed(params.id)) {
    redirect('/dashboard')
  }

  // 2. Fetch Participants
  const { data: rawParticipants } = await supabase
       .from('event_participants')
       .select('user_id, joined_at')
       .eq('event_id', params.id)
       .order('joined_at', { ascending: true })

  // 3. Fetch Profiles for Participants
  type EventProfile = { id: string; full_name?: string | null; avatar_url?: string | null; is_guest?: boolean | null; rating?: number | null; court_position?: 'reves' | 'drive' | 'ambos' | null }
  const userIds = rawParticipants?.map((p) => p.user_id) || []
  const profilesMap: Record<string, EventProfile> = {}

  if (userIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, is_guest, rating, court_position')
            .in('id', userIds)

        profiles?.forEach((p) => {
            profilesMap[p.id] = p
        })
  }

  const isJoined = userIds.includes(user.id)

  const formattedParticipants = rawParticipants?.map((p) => ({
        user_id: p.user_id,
        full_name: profilesMap[p.user_id]?.full_name || 'Jugador',
        avatar_url: profilesMap[p.user_id]?.avatar_url,
        is_guest: profilesMap[p.user_id]?.is_guest ?? false,
        rating: profilesMap[p.user_id]?.rating ?? null,
        court_position: profilesMap[p.user_id]?.court_position ?? null,
    })) || []

  // 4. Build MixingEvent object
  const fullEvent: MixingEvent = {
        ...event,
        rounds: event.rounds || 1,
        duration_minutes: event.duration_minutes || 90,
        participants_count: rawParticipants?.length || 0,
        // Levels never travel to the browser inside the event object.
        participants: formattedParticipants.map(p => ({
          user_id: p.user_id,
          full_name: p.full_name,
          avatar_url: p.avatar_url ?? undefined,
          is_guest: p.is_guest,
        })),
        is_joined: isJoined
  }

  // 5. Get User Role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, avatar_url')
    .eq('id', user.id)
    .single()
  
  const realRole = profile?.role || 'player'
  // Admins see the admin tools only in the admin view (they start in the player view)
  const adminView = await isAdminView(realRole)
  const userRole = adminView ? 'admin' : 'player'

  // A published match (a player looking for players): no draw and no results
  if (fullEvent.kind === 'match') {
    if (isMatchExpired(fullEvent.start_time)) redirect('/')

    const club = Array.isArray(event.club) ? event.club[0] : event.club
    const isOrganizer = fullEvent.created_by === user.id
    const players = formattedParticipants.map(p => ({
      userId: p.user_id,
      name: toTitleCase(p.full_name),
      avatarUrl: p.avatar_url ?? null,
      hand: null,
      isGuest: p.is_guest,
      status: p.user_id === fullEvent.created_by ? 'Organiza' : 'Apuntado',
    }))

    return (
      <>
        <RealtimeRefresher />
        <NotificationListener userId={user.id} />
        <Header
          profile={profile}
          userName={profile?.full_name ?? user.email?.split('@')[0] ?? 'Jugador'}
          isAdmin={realRole === 'admin'}
          adminView={adminView}
        />
        <MatchEventView
          eventId={fullEvent.id}
          startTime={fullEvent.start_time}
          clubId={fullEvent.club_id ?? null}
          clubName={club?.name ?? null}
          maxSpots={fullEvent.max_spots}
          knownPlayers={(event.known_players as string[] | null) ?? []}
          notes={(event.notes as string | null) ?? null}
          heroTitle={formatEventDate(fullEvent.start_time)}
          startsAt={formatEventTime(fullEvent.start_time)}
          players={players}
          isJoined={!!fullEvent.is_joined}
          isOrganizer={isOrganizer}
          canManage={isOrganizer || userRole === 'admin'}
          userRole={userRole}
        />
        <TabBar loggedIn />
      </>
    )
  }

  // Open events (sign-up phase) show the sign-up view; later phases show the draw.
  if (fullEvent.status === 'open') {
    const total = fullEvent.max_spots
    const players = formattedParticipants.map((p, index) => ({
      userId: p.user_id,
      name: toTitleCase(p.full_name),
      avatarUrl: p.avatar_url ?? null,
      hand: p.court_position,
      ...(userRole === 'admin' ? { level: formatLevel(p.rating) } : {}),
      isGuest: p.is_guest,
      status: index < total ? 'Plaza confirmada' : `Reserva ${index - total + 1}`,
    }))

    return (
      <>
        <RealtimeRefresher />
        <NotificationListener userId={user.id} />
        <Header
          profile={profile}
          userName={profile?.full_name ?? user.email?.split('@')[0] ?? 'Jugador'}
          isAdmin={realRole === 'admin'}
          adminView={adminView}
        />
        <EventOpenView
          event={fullEvent}
          eyebrow={`El plan de los ${formatWeekdayPlural(fullEvent.start_time)}`}
          heroTitle={formatEventDate(fullEvent.start_time)}
          startsAt={formatEventTime(fullEvent.start_time)}
          players={players}
          userRole={userRole}
          viewerId={user.id}
        />
        <TabBar loggedIn />
      </>
    )
  }

  if (fullEvent.status === 'in_progress') {
    const isAdmin = userRole === 'admin'
    const rounds = await getEventDraw(supabase, fullEvent.id, user.id, isAdmin)
    // Admin only: the courts of the club, to move a match to another one in situ
    const clubCourts = isAdmin && fullEvent.club_id
      ? ((await supabase.from('courts').select('id, name').eq('club_id', fullEvent.club_id).order('position', { ascending: true })).data ?? [])
      : []
    const club = Array.isArray(event.club) ? event.club[0] : event.club
    const playing = Math.min(formattedParticipants.length, fullEvent.max_spots)

    return (
      <>
        <RealtimeRefresher />
        <NotificationListener userId={user.id} />
        <Header
          profile={profile}
          userName={profile?.full_name ?? user.email?.split('@')[0] ?? 'Jugador'}
          isAdmin={realRole === 'admin'}
          adminView={adminView}
        />
        <EventDrawView
          event={fullEvent}
          eyebrow={[club?.name, formatEventWeekday(fullEvent.start_time)].filter(Boolean).join(' · ')}
          chip={formatEventChip(fullEvent.start_time)}
          title="El sorteo está listo."
          summary={`${fullEvent.rounds} ${fullEvent.rounds === 1 ? 'ronda' : 'rondas'} · ${playing} jugadores`}
          rounds={rounds}
          isAdmin={isAdmin}
          clubCourts={clubCourts}
        />
        <TabBar loggedIn />
      </>
    )
  }

  // Any other status (not expected) has no view
  notFound()
}
