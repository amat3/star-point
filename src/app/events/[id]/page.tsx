import { createClient } from '@/utils/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { EventCard } from '@/components/events/EventCard'
import { ShareEventButton } from '@/components/events/ShareEventButton'
import { RealtimeRefresher } from '@/components/dashboard/RealtimeRefresher'
import { NotificationListener } from '@/components/dashboard/NotificationListener'
import { MixingEvent } from '@/types/events'
import { isEventFullyConfirmed } from '@/app/actions/events'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Header from '@/components/molecules/Header'
import TabBar from '@/components/molecules/TabBar'
import EventOpenView from '@/components/organisms/EventOpenView'
import EventDrawView from '@/components/organisms/EventDrawView'
import { getEventDraw } from '@/lib/event-draw'
import { formatEventChip, formatEventDate, formatEventTime, formatEventWeekday, formatLevel, toTitleCase } from '@/lib/utils'

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
  
  const userRole = profile?.role || 'player'

  // Open events (sign-up phase) use the new design; later phases keep the legacy view for now.
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
        />
        <EventOpenView
          event={fullEvent}
          eyebrow="Mixing semanal"
          heroTitle={formatEventDate(fullEvent.start_time)}
          startsAt={formatEventTime(fullEvent.start_time)}
          players={players}
          userRole={userRole}
        />
        <TabBar loggedIn />
      </>
    )
  }

  if (fullEvent.status === 'in_progress') {
    const isAdmin = userRole === 'admin'
    const rounds = await getEventDraw(supabase, fullEvent.id, user.id, isAdmin)
    const club = Array.isArray(event.club) ? event.club[0] : event.club
    const playing = Math.min(formattedParticipants.length, fullEvent.max_spots)

    return (
      <>
        <RealtimeRefresher />
        <NotificationListener userId={user.id} />
        <Header
          profile={profile}
          userName={profile?.full_name ?? user.email?.split('@')[0] ?? 'Jugador'}
        />
        <EventDrawView
          eyebrow={[club?.name, formatEventWeekday(fullEvent.start_time)].filter(Boolean).join(' · ')}
          chip={formatEventChip(fullEvent.start_time)}
          title="El sorteo está listo."
          summary={`${fullEvent.rounds} ${fullEvent.rounds === 1 ? 'ronda' : 'rondas'} · ${playing} jugadores`}
          rounds={rounds}
          isAdmin={isAdmin}
        />
        <TabBar loggedIn />
      </>
    )
  }

  return (
    <div className="container mx-auto max-w-md py-8 px-4 space-y-8 animate-in fade-in duration-500">
      <RealtimeRefresher />
      <NotificationListener userId={user.id} />
        <div className="flex items-center gap-4 mb-6">
            <Link href="/dashboard">
                <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                    <ArrowLeft className="h-6 w-6 text-gray-500" />
                </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Detalle del Evento</h1>
        </div>
        
        <div>
            <EventCard event={fullEvent} userId={user.id} userRole={userRole} />
        </div>
        
        {userRole === 'admin' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                <div className="border-b border-gray-100 dark:border-gray-700 pb-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Panel de Admin</h3>
                    <p className="text-sm text-gray-500">Gestiona y difunde este evento.</p>
                </div>
                
                <div className="grid gap-3">
                    <ShareEventButton event={fullEvent} />
                </div>
            </div>
        )}
    </div>
  )
}
