import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 0
import { ChangePasswordForm, ProfileForm, SignOutButton } from '@/components/profile/profile-form'
import { ThemeToggle } from '@/components/profile/ThemeToggle'
import { PushNotificationToggle } from '@/components/profile/PushNotificationToggle'
import { AvatarUpload } from '@/components/profile/AvatarUpload'
import Card from '@/components/atoms/Card'
import Content from '@/components/molecules/Content'
import Header from '@/components/molecules/Header'
import ProfileHero from '@/components/molecules/ProfileHero'
import SectionHeader from '@/components/molecules/SectionHeader'
import TabBar from '@/components/molecules/TabBar'
import { isAdminView } from '@/lib/view-mode'
import { toTitleCase } from '@/lib/utils'

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const userName = profile?.full_name ?? user.email?.split('@')[0] ?? 'Jugador'
  const adminView = await isAdminView(profile?.role)

  return (
    <>
      <Header profile={profile} userName={userName} isAdmin={profile?.role === 'admin'} adminView={adminView} />

      <Content>
        <ProfileHero
          avatar={<AvatarUpload userId={user.id} avatarUrl={profile?.avatar_url} userName={userName} />}
          name={toTitleCase(userName)}
          caption="Toca la foto para cambiarla"
        />

        <SectionHeader title="Mis datos" />
        <Card>
          <ProfileForm userId={user.id} currentName={userName} profile={profile} />
        </Card>

        <SectionHeader title="Ajustes" />
        <Card>
          <ThemeToggle />
          <PushNotificationToggle />
        </Card>

        <SectionHeader title="Contraseña" />
        <Card>
          <ChangePasswordForm />
        </Card>

        <SignOutButton />
      </Content>

      <TabBar loggedIn />
    </>
  )
}
