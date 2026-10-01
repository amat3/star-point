import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 0
import { RealtimeRefresher } from '@/components/dashboard/RealtimeRefresher'
import { NotificationListener } from '@/components/dashboard/NotificationListener'
import Content from '@/components/molecules/Content'
import EmptyState from '@/components/molecules/EmptyState'
import EventListItem from '@/components/molecules/EventListItem'
import Header from '@/components/molecules/Header'
import PageIntro from '@/components/molecules/PageIntro'
import SectionHeader from '@/components/molecules/SectionHeader'
import TabBar from '@/components/molecules/TabBar'
import { getOpenEvents } from '@/app/actions/events'
import { isAdminView } from '@/lib/view-mode'
import { formatEventDay, formatEventMonth, formatEventTime } from '@/lib/utils'
import type { MixingEvent } from '@/types/events'

// All mixings the viewer can still act on, grouped by moment, each with the
// viewer's own status. Opening one leads to /events/[id].
export default async function MixingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login?next=/mixing')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, role')
    .eq('id', user.id)
    .single()

  const userName = profile?.full_name ?? user.email?.split('@')[0] ?? 'Jugador'
  const adminView = await isAdminView(profile?.role)

  const events = await getOpenEvents()
  const inProgress = events.filter(e => e.status === 'in_progress')
  const upcoming = events.filter(e => e.status === 'open')

  // Which running events have matches for the viewer
  const playingIn = new Set<string>()
  if (inProgress.length > 0) {
    const { data: matches } = await supabase
      .from('matches')
      .select('event_id')
      .in('event_id', inProgress.map(e => e.id))
      .or(`player_a1.eq.${user.id},player_a2.eq.${user.id},player_b1.eq.${user.id},player_b2.eq.${user.id}`)
    matches?.forEach(m => m.event_id && playingIn.add(m.event_id))
  }

  const renderEvent = (event: MixingEvent) => {
    const count = event.participants_count ?? 0
    const spotsLeft = event.max_spots - count
    const position = (event.participants ?? []).findIndex(p => p.user_id === user.id)

    let availability: string
    let joined = false
    let warn = false

    if (event.status === 'in_progress') {
      joined = playingIn.has(event.id)
      availability = joined ? 'Tienes partidos' : 'En juego'
    } else if (position >= 0 && position < event.max_spots) {
      joined = true
      availability = 'Estás apuntado'
    } else if (position >= event.max_spots) {
      joined = true
      warn = true
      availability = `En reserva (${position - event.max_spots + 1})`
    } else if (spotsLeft > 0) {
      availability = `${spotsLeft} ${spotsLeft === 1 ? 'plaza disponible' : 'plazas disponibles'}`
    } else {
      warn = true
      availability = 'Completo'
    }

    return (
      <EventListItem
        key={event.id}
        href={`/events/${event.id}`}
        day={formatEventDay(event.start_time)}
        month={formatEventMonth(event.start_time)}
        title={event.title}
        time={formatEventTime(event.start_time)}
        venue={event.club?.name}
        availability={availability}
        full={warn}
        joined={joined}
      />
    )
  }

  return (
    <>
      <RealtimeRefresher />
      <NotificationListener userId={user.id} />
      <Header profile={profile} userName={userName} isAdmin={profile?.role === 'admin'} adminView={adminView} />
      <PageIntro title="Mixing" subtitle="Tus partidas semanales" />

      <Content>
        {events.length === 0 && <EmptyState>Aún no hay mixings abiertos.</EmptyState>}

        {inProgress.length > 0 && (
          <>
            <SectionHeader title="En curso" />
            {inProgress.map(renderEvent)}
          </>
        )}

        {upcoming.length > 0 && (
          <>
            <SectionHeader title="Próximos" />
            {upcoming.map(renderEvent)}
          </>
        )}
      </Content>

      <TabBar loggedIn />
    </>
  )
}
