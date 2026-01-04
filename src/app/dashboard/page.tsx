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
import { ViewToggle } from '@/components/dashboard/ViewToggle'
import { MatchHistory } from '@/components/dashboard/MatchHistory'
import { PlusCircle, Trophy, Activity, Medal, CalendarDays, ClipboardCheck, ListChecks, History, ChevronRight } from 'lucide-react'
import { getOpenEvents } from '@/app/actions/events'
import { EventCard } from '@/components/events/EventCard'
import { CreateEventDialog } from '@/components/events/CreateEventDialog'

interface DashboardProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function DashboardPage(props: DashboardProps) {
  const searchParams = await props.searchParams
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
  const realRole = profile?.role ?? 'player'
  // If user is admin AND ?view=player is present, downgrade effective role to player
  const isViewPlayer = searchParams?.view === 'player'
  const userRole = (realRole === 'admin' && isViewPlayer) ? 'player' : realRole

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
      p_b2:profiles!player_b2(full_name),
      last_updated_by,
      court_number,
      event:events(title, start_time, duration_minutes, rounds),
      created_at
    `)
    .in('status', ['pending', 'disputed'])

    
  if (userRole !== 'admin') {
     pendingQuery = pendingQuery
       .neq('creator_id', user.id) // Players cannot validate their own matches
       .or(`player_a1.eq.${user.id},player_a2.eq.${user.id},player_b1.eq.${user.id},player_b2.eq.${user.id}`)
  }

  const { data: pendingMatches } = await pendingQuery

  // Fetch Created Matches (User IS creator and pending)
  let createdQuery = supabase
    .from('matches')
    .select(`
      *,
      p_a1:profiles!player_a1(full_name),
      p_a2:profiles!player_a2(full_name),
      p_b1:profiles!player_b1(full_name),
      p_b2:profiles!player_b2(full_name),
      court_number,
      event:events(title, start_time, duration_minutes, rounds)
    `)
    .in('status', ['pending', 'disputed'])
    .eq('creator_id', user.id)
    .neq('match_type', 'mixing')

  if (userRole !== 'admin') {
      createdQuery = createdQuery.or(`player_a1.eq.${user.id},player_a2.eq.${user.id},player_b1.eq.${user.id},player_b2.eq.${user.id}`)
  }

  const { data: createdMatches } = await createdQuery

  const openEvents = await getOpenEvents()

  return (
    <div className="animate-in fade-in duration-500">
      {/* Header Section */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm dark:bg-gray-800/80 sticky top-0 z-50 transition-all border-b border-gray-100 dark:border-gray-700">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-4">
            <UserMenu profile={profile} userName={userName} />
            <div className="hidden xs:flex items-center space-x-2 border-l border-gray-200 dark:border-gray-700 pl-4 h-8">
               <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Nivel:</span>
               <Badge className="bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                  {userLevel}
               </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {realRole === 'admin' && <ViewToggle />}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
        
        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <LevelCard level={userLevel} />

        </div>

        {/* Next Mixings Section */}
        <section className="space-y-4">
           <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                 <CalendarDays className="h-5 w-5 text-primary" />
                 Próximos Mixings
              </h2>
              {userRole === 'admin' && <CreateEventDialog />}
           </div>
           
           {openEvents.length === 0 ? (
               <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                    <p className="text-muted-foreground text-sm">No hay convocatorias abiertas en este momento.</p>
               </div>
           ) : (
               <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                   {openEvents.map(event => (
                       <EventCard key={event.id} event={event} userId={user.id} userRole={userRole} />
                   ))}
               </div>
           )}
        </section>

        {/* Action Required Section */}
        <section className="space-y-8">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  Partidos por Validar
              </h2>
              {/* Badge already handled in logic above? No, logic above just showed number. Let's keep it consistent pattern. */}
              {pendingMatches && pendingMatches.length > 0 && (
                  <Badge variant="destructive">{pendingMatches.length}</Badge>
              )}
            </div>
            <ValidationList matches={pendingMatches || []} userId={user.id} userRole={userRole} />
          </div>

          <div>
             <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-primary" />
                    Mis Partidos Registrados
                </h2>
                <MatchesActions />
             </div>
             <CreatedMatchesList matches={createdMatches || []} />
          </div>
        </section>

        {/* Match History Link */}
        <section className="pt-4 border-t border-gray-100 dark:border-gray-800">
          <Link href="/history" className="group flex items-center justify-between p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <History className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Historial de Partidos</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Consulta todos tus resultados anteriores</p>
                </div>
             </div>
             <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors" />
          </Link>
        </section>

      </main>

    </div>
  )
}
