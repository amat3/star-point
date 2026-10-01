import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 0
import Content from '@/components/molecules/Content'
import Header from '@/components/molecules/Header'
import PageIntro from '@/components/molecules/PageIntro'
import SectionHeader from '@/components/molecules/SectionHeader'
import StatsRow from '@/components/molecules/StatsRow'
import TabBar from '@/components/molecules/TabBar'
import HistoryList from '@/components/organisms/HistoryList'
import { getMatchHistory, getPlayerGameStats } from '@/app/actions/matches'
import { isAdminView } from '@/lib/view-mode'

export default async function HistoryPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login?next=/history')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, role, matches_played, matches_won, win_ratio')
    .eq('id', user.id)
    .single()

  const userName = profile?.full_name ?? user.email?.split('@')[0] ?? 'Jugador'
  const adminView = await isAdminView(profile?.role)

  const { gamesWon, gamesLost } = await getPlayerGameStats(user.id)
  const { matches, hasMore } = await getMatchHistory(1)

  return (
    <>
      <Header profile={profile} userName={userName} isAdmin={profile?.role === 'admin'} adminView={adminView} />
      <PageIntro title="Historial" subtitle="Todos tus partidos" />

      <Content>
        <StatsRow
          matchesPlayed={profile?.matches_played ?? 0}
          matchesWon={profile?.matches_won ?? 0}
          winRatio={profile?.win_ratio ?? 0}
          gamesWon={gamesWon}
          gamesLost={gamesLost}
        />

        <SectionHeader title="Partidos" />
        <HistoryList initialMatches={matches} initialHasMore={hasMore} />
      </Content>

      <TabBar loggedIn />
    </>
  )
}
