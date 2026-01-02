import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ValidationList } from '@/components/matches/lists/ValidationList'
import { CreatedMatchesList } from '@/components/matches/lists/CreatedMatchesList'
import { MatchesActions } from '@/components/matches/matches-actions'
import { UserMenu } from '@/components/dashboard/UserMenu'
import { LevelCard } from '@/components/dashboard/LevelCard'
import { PlusCircle, Trophy, Activity, Medal } from 'lucide-react'

export default async function DashboardPage() {
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

  // Fallback defaults if profile doesn't exist yet (or handle error)
  const userRole = profile?.role ?? 'player'
  const userLevel = profile?.rating?.toFixed(2) ?? '0.00'
  const userName = profile?.full_name ?? user.email?.split('@')[0] ?? 'Jugador'
  const matchesPlayed = profile?.matches_played ?? 0
  const winRatio = profile?.win_ratio ? `${(profile.win_ratio * 100).toFixed(0)}%` : '0%' // Assuming win_ratio is decimal
  const ranking = profile?.ranking ?? '-' // Assuming ranking column

  // Fetch Pending Validation Matches
  // ADMIN: Ver todos los pendientes excepto los suyos (o todos).
  // USER: Ver solo donde participa
  let pendingQuery = supabase
    .from('matches')
    .select(`
      *,
      p_a1:profiles!player_a1(full_name),
      p_a2:profiles!player_a2(full_name),
      p_b1:profiles!player_b1(full_name),
      p_b2:profiles!player_b2(full_name)
    `)
    .in('status', ['pending', 'disputed'])

    
  if (userRole !== 'admin') {
     pendingQuery = pendingQuery
       .neq('creator_id', user.id) // Players cannot validate their own matches
       .or(`player_a1.eq.${user.id},player_a2.eq.${user.id},player_b1.eq.${user.id},player_b2.eq.${user.id}`)
  }

  const { data: pendingMatches } = await pendingQuery

  // Fetch Created Matches (User IS creator and pending)
  const { data: createdMatches } = await supabase
    .from('matches')
    .select(`
      *,
      p_a1:profiles!player_a1(full_name),
      p_a2:profiles!player_a2(full_name),
      p_b1:profiles!player_b1(full_name),
      p_b2:profiles!player_b2(full_name)
    `)
    .in('status', ['pending', 'disputed'])
    .eq('creator_id', user.id)

  return (
    <div className="animate-in fade-in duration-500">
      {/* Header Section */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm dark:bg-gray-800/80 sticky top-0 z-10 transition-all border-b border-gray-100 dark:border-gray-700">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-4">
            <UserMenu profile={profile} userName={userName} />
            <div className="hidden xs:flex items-center space-x-2 border-l border-gray-200 dark:border-gray-700 pl-4 h-8">
               <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Nivel:</span>
               <Badge className="bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                  {userLevel}
               </Badge>
            </div>
          </div>
          
          {/* Quick Action */}
          <MatchesActions />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
        
        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <LevelCard level={userLevel} />
          <Card className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Partidos Jugados</CardTitle>
              <Activity className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{matchesPlayed}</div>
            </CardContent>
          </Card>
          <Card className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ratio de Victoria</CardTitle>
              <Trophy className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{winRatio}</div>
            </CardContent>
          </Card>
        </div>

        {/* Action Required Section */}
        <section className="space-y-8">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  Partidos por Validar
              </h2>
              {pendingMatches && pendingMatches.length > 0 && (
                  <Badge variant="destructive">{pendingMatches.length}</Badge>
              )}
            </div>
            <ValidationList matches={pendingMatches || []} userId={user.id} userRole={userRole} />
          </div>

          <CreatedMatchesList matches={createdMatches || []} />
        </section>

      </main>

    </div>
  )
}
