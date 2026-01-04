import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MatchHistory } from '@/components/dashboard/MatchHistory'
import { ArrowLeft, History, Trophy, Activity, Medal } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function HistoryPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  // Fetch Profile Stats
  const { data: profile } = await supabase
    .from('profiles')
    .select('matches_played, win_ratio')
    .eq('id', user.id)
    .single()

  const matchesPlayed = profile?.matches_played ?? 0
  const winRatio = profile?.win_ratio ? `${(profile.win_ratio * 100).toFixed(0)}%` : '0%'

  return (
    <div className="min-h-screen bg-background animate-in fade-in duration-500">
      {/* Header Section */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm dark:bg-gray-800/80 sticky top-0 z-10 transition-all border-b border-gray-100 dark:border-gray-700">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              href="/dashboard" 
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Volver al Dashboard"
            >
              <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-300" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <History className="h-6 w-6 text-primary" />
                Historial Completo
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
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
              <CardTitle className="text-sm font-medium">Ratio de Victoria</CardTitle>
              <Trophy className="h-4 w-4 text-lime-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{winRatio}</div>
            </CardContent>
          </Card>
        </div>

        <MatchHistory userId={user.id} />
      </main>
    </div>
  )
}
