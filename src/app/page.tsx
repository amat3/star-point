import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0
import { RealtimeRefresher } from '@/components/dashboard/RealtimeRefresher'
import { NotificationListener } from '@/components/dashboard/NotificationListener'
import Content from '@/components/molecules/Content'
import EmptyState from '@/components/molecules/EmptyState'
import EventListItem from '@/components/molecules/EventListItem'
import PendingActions from '@/components/molecules/PendingActions'
import LastMatchRow from '@/components/molecules/LastMatchRow'
import StatsRow from '@/components/molecules/StatsRow'
import SectionHeader from '@/components/molecules/SectionHeader'
import Greeting from '@/components/molecules/Greeting'
import Header from '@/components/molecules/Header'
import TabBar from '@/components/molecules/TabBar'
import { getOpenEvents, getPublicEvents } from '@/app/actions/events'
import { SAMPLE_PENDING_ACTIONS } from '@/lib/sample-pending-actions'
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
  // Admin-only layout previews while the cards are being designed.
  const visibleActions = profile?.role === 'admin' ? [...SAMPLE_PENDING_ACTIONS, ...pendingActions] : pendingActions
  const lastMatch = user ? await getLastMatch(user.id) : null
  const events = user ? await getOpenEvents() : await getPublicEvents()

  return (
    <>
      {user && <RealtimeRefresher />}
      {user && <NotificationListener userId={user.id} />}
      <Header profile={profile} userName={userName} />
      <Greeting
        date={formatTodayLong()}
        name={userName ? toTitleCase(userName.split(' ')[0]) : undefined}
      />
      <Content>
        <PendingActions actions={visibleActions} nextRevealAt={nextRevealAt} />
        <SectionHeader title="Lo que viene" />
        {events.length === 0 && <EmptyState>Aún no hay mixings abiertos.</EmptyState>}
        {events.map(event => {
          const spotsLeft = event.max_spots - (event.participants_count ?? 0)
          const eventPath = `/events/${event.id}`
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
                  ? 'En juego'
                  : spotsLeft > 0
                    ? `${spotsLeft} ${spotsLeft === 1 ? 'plaza disponible' : 'plazas disponibles'}`
                    : 'Completo'
              }
              full={event.status === 'open' && spotsLeft <= 0}
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
            />
          </>
        )}
      </Content>
      <TabBar loggedIn={!!user} />
    </>
  )
}

