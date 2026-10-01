export const dynamic = 'force-dynamic'
export const revalidate = 0

import Content from '@/components/molecules/Content'
import Header from '@/components/molecules/Header'
import PageIntro from '@/components/molecules/PageIntro'
import TabBar from '@/components/molecules/TabBar'
// Legacy list (Tailwind) until it is migrated: lets admins review every pending match.
import { ValidationList } from '@/components/matches/lists/ValidationList'
import { RealtimeRefresher } from '@/components/dashboard/RealtimeRefresher'
import { requireAdmin } from '@/lib/admin'
import { isAdminView } from '@/lib/view-mode'
import type { Match } from '@/types'

export default async function AdminMatchesPage() {
  const { supabase, user, profile } = await requireAdmin()

  const { data: pendingMatches } = await supabase
    .from('matches')
    .select(`
      *,
      p_a1:profiles!player_a1(full_name, is_guest, avatar_url),
      p_a2:profiles!player_a2(full_name, is_guest, avatar_url),
      p_b1:profiles!player_b1(full_name, is_guest, avatar_url),
      p_b2:profiles!player_b2(full_name, is_guest, avatar_url),
      court:courts(name),
      event:events(title, start_time, duration_minutes, rounds)
    `)
    .in('status', ['pending', 'disputed'])

  return (
    <>
      <RealtimeRefresher />
      <Header
        profile={profile}
        userName={profile.full_name ?? user.email?.split('@')[0] ?? 'Admin'}
        isAdmin
        adminView={await isAdminView(profile.role)}
      />
      <PageIntro title="Partidos pendientes" subtitle="Todos los partidos sin confirmar" />

      <Content>
        <ValidationList matches={(pendingMatches ?? []) as unknown as Match[]} userId={user.id} userRole="admin" />
      </Content>

      <TabBar loggedIn />
    </>
  )
}
