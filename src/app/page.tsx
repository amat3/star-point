import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0
import { RealtimeRefresher } from '@/components/dashboard/RealtimeRefresher'
import { NotificationListener } from '@/components/dashboard/NotificationListener'
import { TimeRefresher } from '@/components/dashboard/TimeRefresher'
import Content from '@/components/molecules/Content'
import EmptyEvents from '@/components/molecules/EmptyEvents'
import EventListItem from '@/components/molecules/EventListItem'
import PendingActions from '@/components/molecules/PendingActions'
import LastMatchRow from '@/components/molecules/LastMatchRow'
import StatsRow from '@/components/molecules/StatsRow'
import SectionHeader from '@/components/molecules/SectionHeader'
import Greeting from '@/components/molecules/Greeting'
import Header from '@/components/molecules/Header'
import { Footer } from '@/components/layout/Footer'
import TabBar from '@/components/molecules/TabBar'
import { getOpenEvents, getPublicEvents } from '@/app/actions/events'
import { isAdminView } from '@/lib/view-mode'
import { MATCH_DURATION_MINUTES, missingLabel } from '@/lib/match-events'
import { drawAvailability, isDrawCreated, joinedAvailability, mixingAvailability } from '@/lib/event-capacity'
import { getLastMatch, getPendingActions } from '@/app/actions/matches'
import { formatEventDay, formatEventMonth, formatEventTime, formatRelativeDay, formatTodayLong, toTitleCase } from '@/lib/utils'

// Public home: visitors see the open events (counts only, no names);
// signing in is required to open them.
export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const profile = user
    ? (await supabase.from('profiles').select('full_name, avatar_url, role, matches_played, matches_won, win_ratio').eq('id', user.id).single()).data
    : null

  const userName = user ? (profile?.full_name ?? user.email?.split('@')[0] ?? 'Jugador') : undefined

  const { actions: pendingActions, nextRevealAt } = user
    ? await getPendingActions(user.id)
    : { actions: [], nextRevealAt: null }
  const adminView = await isAdminView(profile?.role)
  const lastMatch = user ? await getLastMatch(user.id) : null
  const events = user ? await getOpenEvents() : await getPublicEvents()

  // What changes by itself on this page: a partido disappears when it ends, a published
  // draw goes from "Partidos creados" to "En juego" when it starts
  const refreshTimes = events.flatMap(event =>
    event.kind === 'match'
      ? [new Date(new Date(event.start_time).getTime() + MATCH_DURATION_MINUTES * 60_000).toISOString()]
      : event.status === 'in_progress'
        ? [event.start_time]
        : []
  )

  return (
    <>
      {user && <RealtimeRefresher />}
      {user && <NotificationListener userId={user.id} />}
      <TimeRefresher times={refreshTimes} />
      <Header profile={profile} userName={userName} isAdmin={profile?.role === 'admin'} adminView={adminView} />
      <Greeting
        date={formatTodayLong()}
        name={userName ? toTitleCase(userName.split(' ')[0]) : undefined}
      />
      <Content $clearTabBar={false}>
        <PendingActions actions={pendingActions} nextRevealAt={nextRevealAt} />
        <SectionHeader title="Lo que viene" />
        {events.length === 0 && <EmptyEvents canPublish={!!user} />}
        {events.map(event => {
          const spotsLeft = event.max_spots - (event.participants_count ?? 0)
          const eventPath = `/events/${event.id}`
          const position = 'participants' in event ? (event.participants ?? []).findIndex(p => p.user_id === user?.id) : -1
          const joined = !!user && position >= 0
          return (
            <EventListItem
              key={event.id}
              href={user ? eventPath : `/login?next=${eventPath}`}
              locked={!user}
              day={formatEventDay(event.start_time)}
              month={formatEventMonth(event.start_time)}
              title={event.title}
              time={formatEventTime(event.start_time)}
              venue={event.club?.name}
              availability={
                event.status === 'in_progress'
                  ? drawAvailability(event.start_time)
                  : joined
                    ? joinedAvailability(position, event.participants_count ?? 0, event.max_spots)
                  : event.kind === 'match'
                    ? spotsLeft <= 0
                      ? 'Completo'
                      : missingLabel(spotsLeft)
                    : mixingAvailability(event.participants_count ?? 0, event.max_spots)
              }
              full={event.status === 'open' && spotsLeft <= 0}
              created={event.status === 'in_progress' && isDrawCreated(event.start_time)}
              joined={joined}
            />
          )
        })}
        {user && (
          <StatsRow
            matchesPlayed={profile?.matches_played ?? 0}
            matchesWon={profile?.matches_won ?? 0}
            winRatio={profile?.win_ratio ?? 0}
          />
        )}
        {lastMatch && (
          <>
            <SectionHeader title="Último partido" action={{ label: 'Ver todo', href: '/history' }} />
            <LastMatchRow
              title={`${{ win: 'Victoria', loss: 'Derrota', draw: 'Empate' }[lastMatch.outcome]}${lastMatch.partnerName ? ` con ${toTitleCase(lastMatch.partnerName)}` : ''}`}
              meta={[formatRelativeDay(lastMatch.playedAt), lastMatch.clubName].filter(Boolean).join(' · ')}
              score={lastMatch.score}
              outcome={lastMatch.outcome}
            />
          </>
        )}
      </Content>
      <Footer />
      <TabBar loggedIn={!!user} />
    </>
  )
}

