export const dynamic = 'force-dynamic'
export const revalidate = 0

import Content from '@/components/molecules/Content'
import Header from '@/components/molecules/Header'
import PageIntro from '@/components/molecules/PageIntro'
import TabBar from '@/components/molecules/TabBar'
import AdminMatchesList from '@/components/organisms/AdminMatchesList'
import { RealtimeRefresher } from '@/components/dashboard/RealtimeRefresher'
import { getAdminPendingMatches } from '@/lib/admin-pending'
import { requireAdmin } from '@/lib/admin'
import { isAdminView } from '@/lib/view-mode'

export default async function AdminMatchesPage() {
  const { supabase, user, profile } = await requireAdmin()

  const groups = await getAdminPendingMatches(supabase)

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
        <AdminMatchesList groups={groups} />
      </Content>

      <TabBar loggedIn />
    </>
  )
}
