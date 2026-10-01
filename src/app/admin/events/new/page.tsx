export const dynamic = 'force-dynamic'
export const revalidate = 0

import Content from '@/components/molecules/Content'
import Header from '@/components/molecules/Header'
import PageIntro from '@/components/molecules/PageIntro'
import TabBar from '@/components/molecules/TabBar'
import NewEventForm from '@/components/events/NewEventForm'
import { requireAdmin } from '@/lib/admin'
import { isAdminView } from '@/lib/view-mode'

export default async function NewEventPage() {
  const { supabase, user, profile } = await requireAdmin()

  const { data: clubs } = await supabase.from('clubs').select('id, name').order('name')

  return (
    <>
      <Header
        profile={profile}
        userName={profile.full_name ?? user.email?.split('@')[0] ?? 'Admin'}
        isAdmin
        adminView={await isAdminView(profile.role)}
      />
      <PageIntro title="Crear evento" subtitle="Convoca un mixing para que se apunten los jugadores" />

      <Content>
        <NewEventForm clubs={clubs ?? []} />
      </Content>

      <TabBar loggedIn />
    </>
  )
}
