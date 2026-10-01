export const dynamic = 'force-dynamic'
export const revalidate = 0

import Content from '@/components/molecules/Content'
import Header from '@/components/molecules/Header'
import PageIntro from '@/components/molecules/PageIntro'
import TabBar from '@/components/molecules/TabBar'
import ExclusionsManager from '@/components/organisms/ExclusionsManager'
import { getExclusions } from '@/app/actions/admin-exclusions'
import { requireAdmin } from '@/lib/admin'
import { isAdminView } from '@/lib/view-mode'

export default async function ExclusionsPage() {
  const { supabase, user, profile } = await requireAdmin()

  const exclusions = await getExclusions()
  const { data: players } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('is_guest', false)
    .order('full_name')

  return (
    <>
      <Header
        profile={profile}
        userName={profile.full_name ?? user.email?.split('@')[0] ?? 'Admin'}
        isAdmin
        adminView={await isAdminView(profile.role)}
      />
      <PageIntro title="Exclusiones" subtitle="Parejas que el algoritmo evitará al generar rondas" />

      <Content>
        <ExclusionsManager exclusions={exclusions} players={players ?? []} />
      </Content>

      <TabBar loggedIn />
    </>
  )
}
