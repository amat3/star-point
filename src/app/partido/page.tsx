export const dynamic = 'force-dynamic'
export const revalidate = 0

import { redirect } from 'next/navigation'
import Content from '@/components/molecules/Content'
import Header from '@/components/molecules/Header'
import PageIntro from '@/components/molecules/PageIntro'
import TabBar from '@/components/molecules/TabBar'
import PublishMatch from '@/components/events/PublishMatch'
import { createClient } from '@/utils/supabase/server'
import { isAdminView } from '@/lib/view-mode'

// "+ Partido": publish a match to look for players in the group.
export default async function MatchPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login?next=/partido')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, role')
    .eq('id', user.id)
    .single()

  const { data: clubs } = await supabase.from('clubs').select('id, name').order('name')

  return (
    <>
      <Header
        profile={profile}
        userName={profile?.full_name ?? user.email?.split('@')[0] ?? 'Jugador'}
        isAdmin={profile?.role === 'admin'}
        adminView={await isAdminView(profile?.role)}
      />
      <PageIntro title="Publicar partido" subtitle="Busca jugadores del grupo para completar tu partido" />

      <Content>
        <PublishMatch clubs={clubs ?? []} />
      </Content>

      <TabBar loggedIn />
    </>
  )
}
