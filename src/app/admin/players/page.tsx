export const dynamic = 'force-dynamic'
export const revalidate = 0

import Content from '@/components/molecules/Content'
import Header from '@/components/molecules/Header'
import PageIntro from '@/components/molecules/PageIntro'
import TabBar from '@/components/molecules/TabBar'
// Legacy panel (Tailwind) until it is migrated.
import { PlayerRankingPanel } from '@/components/dashboard/PlayerRankingPanel'
import { requireAdmin } from '@/lib/admin'
import { isAdminView } from '@/lib/view-mode'

export default async function AdminPlayersPage() {
  const { user, profile } = await requireAdmin()

  return (
    <>
      <Header
        profile={profile}
        userName={profile.full_name ?? user.email?.split('@')[0] ?? 'Admin'}
        isAdmin
        adminView={await isAdminView(profile.role)}
      />
      <PageIntro title="Jugadores" subtitle="Niveles y posiciones del grupo" />

      <Content>
        <PlayerRankingPanel userRole="admin" />
      </Content>

      <TabBar loggedIn />
    </>
  )
}
