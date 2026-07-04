import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0
import { ProfileForm } from '@/components/profile/profile-form'
import { ThemeToggle } from '@/components/profile/ThemeToggle'
import { PushNotificationToggle } from '@/components/profile/PushNotificationToggle'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft } from 'lucide-react'
import { toTitleCase } from '@/lib/utils'

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  // Fetch Profile Data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const userName = profile?.full_name ?? user.email?.split('@')[0] ?? 'Jugador'

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 animate-in fade-in duration-500">
      {/* Header Section */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm dark:bg-gray-800/80 sticky top-0 z-10 transition-all border-b border-gray-100 dark:border-gray-700">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              href="/dashboard" 
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Volver al Dashboard"
            >
              <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-300" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mi Perfil</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-6">
              <Avatar className="h-24 w-24 border-4 border-lime-500">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-lime-100 text-lime-800 text-3xl font-bold">
                  {userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {toTitleCase(userName)}
                </h2>
              </div>
            </div>
          </CardContent>
        </Card>



        {/* Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle>Editar Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm userId={user.id} currentName={userName} profile={profile} />
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle>Apariencia</CardTitle>
          </CardHeader>
          <CardContent>
            <ThemeToggle />
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notificaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <PushNotificationToggle />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
