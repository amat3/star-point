export const dynamic = 'force-dynamic'
export const revalidate = 0

import Content from '@/components/molecules/Content'
import Header from '@/components/molecules/Header'
import PageIntro from '@/components/molecules/PageIntro'
import TabBar from '@/components/molecules/TabBar'
import PlayersAdminList, { type AdminPlayer } from '@/components/organisms/PlayersAdminList'
import { getPlayersRanking } from '@/app/actions/users'
import { requireAdmin } from '@/lib/admin'
import { isAdminView } from '@/lib/view-mode'

export default async function AdminPlayersPage() {
  const { user, profile } = await requireAdmin()
  const players = (await getPlayersRanking()) as AdminPlayer[]

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
        <PlayersAdminList players={players} />
      </Content>

      <TabBar loggedIn />
    </>
  )
}
