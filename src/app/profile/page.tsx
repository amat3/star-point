import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProfileForm } from '@/components/profile/profile-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Activity, Shield, ArrowLeft } from 'lucide-react'

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

  const userLevel = profile?.rating?.toFixed(2) ?? '0.00'
  const userName = profile?.full_name ?? user.email?.split('@')[0] ?? 'Jugador'
  const matchesPlayed = profile?.matches_played ?? 0
  const userRole = profile?.role ?? 'player'

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 animate-in fade-in duration-500">
      {/* Header Section */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm dark:bg-gray-800/80 sticky top-0 z-10 transition-all border-b border-gray-100 dark:border-gray-700">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex items-center justify-between">
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

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
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
                  {userName}
                </h2>
                <div className="mt-2 flex items-center justify-center sm:justify-start space-x-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Nivel Actual:</span>
                  <Badge className="bg-lime-500 hover:bg-lime-600 text-white text-lg px-3 py-1">
                    {userLevel}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Partidos Jugados</CardTitle>
              <Activity className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{matchesPlayed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rol</CardTitle>
              <Shield className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{userRole === 'admin' ? 'Admin' : 'Jugador'}</div>
            </CardContent>
          </Card>
        </div>

        {/* Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle>Editar Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm userId={user.id} currentName={userName} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
