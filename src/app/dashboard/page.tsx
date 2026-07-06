import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0
import { Badge } from '@/components/ui/badge'
import { ValidationList } from '@/components/matches/lists/ValidationList'
import { UserMenu } from '@/components/dashboard/UserMenu'
import { MotivationalCard } from '@/components/dashboard/MotivationalCard'
import { ViewToggle } from '@/components/dashboard/ViewToggle'
import { CalendarDays, ClipboardCheck, History, ChevronRight } from 'lucide-react'
import { getOpenEvents } from '@/app/actions/events'
import { EventCard } from '@/components/events/EventCard'
import { CreateEventDialog } from '@/components/events/CreateEventDialog'
import { PlayerRankingPanel } from '@/components/dashboard/PlayerRankingPanel'
import { RealtimeRefresher } from '@/components/dashboard/RealtimeRefresher'
import { NotificationListener } from '@/components/dashboard/NotificationListener'

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
  // Admins see player view by default; ?view=admin activates admin features
  const isViewAdmin = searchParams?.view === 'admin'
  const userRole = (realRole === 'admin' && isViewAdmin) ? 'admin' : (realRole === 'admin' ? 'player' : realRole)

  const userName = profile?.full_name ?? user.email?.split('@')[0] ?? 'Jugador'
  const userGender = profile?.gender ?? 'otro'

  // Fetch Pending Validation Matches
  // ADMIN: Ver todos los pendientes excepto los suyos (o todos).
  // USER: Ver solo donde participa
  let pendingQuery = supabase
    .from('matches')
    .select(`
      *,
      p_a1:profiles!player_a1(full_name, is_guest, avatar_url),
      p_a2:profiles!player_a2(full_name, is_guest, avatar_url),
      p_b1:profiles!player_b1(full_name, is_guest, avatar_url),
      p_b2:profiles!player_b2(full_name, is_guest, avatar_url),
      last_updated_by,
      court_number,
      event:events(title, start_time, duration_minutes, rounds),
      created_at
    `)
    .in('status', ['pending', 'disputed'])

    
  if (userRole !== 'admin') {
    const participantFilter = `player_a1.eq.${user.id},player_a2.eq.${user.id},player_b1.eq.${user.id},player_b2.eq.${user.id}`
    pendingQuery = pendingQuery.or(
      `and(match_type.eq.mixing,or(${participantFilter})),and(match_type.eq.standard,creator_id.neq.${user.id},or(${participantFilter}))`
    )
  }

  const { data: pendingMatches } = await pendingQuery

  const openEvents = await getOpenEvents()
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24))

  return (
    <div className="animate-in fade-in duration-500">
      <RealtimeRefresher />
      <NotificationListener userId={user.id} />
      {/* Header Section */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm dark:bg-gray-800/80 sticky top-0 z-50 transition-all border-b border-gray-100 dark:border-gray-700">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-4">
            <UserMenu profile={profile} userName={userName} />
          </div>
          
          <div className="flex items-center gap-2">
            {realRole === 'admin' && <ViewToggle />}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
        
        <MotivationalCard userName={userName} gender={userGender} dayIndex={dayIndex} />

        {/* Next Mixings Section */}
        <section className="space-y-4">
           <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                 <CalendarDays className="h-6 w-6 sm:h-5 sm:w-5 text-primary" />
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
              <h2 className="text-xl sm:text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <ClipboardCheck className="h-6 w-6 sm:h-5 sm:w-5 text-primary" />
                  Partidos por Validar
              </h2>
              {/* Badge already handled in logic above? No, logic above just showed number. Let's keep it consistent pattern. */}
              {pendingMatches && pendingMatches.length > 0 && (
                  <Badge variant="destructive">{pendingMatches.length}</Badge>
              )}
            </div>
            <ValidationList matches={pendingMatches || []} userId={user.id} userRole={userRole} />
          </div>

          {/* Mis Partidos Registrados — oculto en ambos roles, lógica preservada */}
        </section>

        {/* Player Ranking — solo admin */}
        {realRole === 'admin' && (
          <section className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <PlayerRankingPanel />
          </section>
        )}

        {/* Match History Link */}
        <section className="pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl sm:text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <History className="h-6 w-6 sm:h-5 sm:w-5 text-primary" />
                  Historial de Partidos
              </h2>
          </div>
          <Link href="/history" className="group flex items-center justify-between p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
             <div className="flex items-center gap-3">

                <div>
                    <p className="text-muted-foreground text-base sm:text-sm">Consulta y filtra todos tus resultados anteriores</p>
                </div>
             </div>
             <ChevronRight className="h-6 w-6 sm:h-5 sm:w-5 text-gray-400 group-hover:text-primary transition-colors" />
          </Link>
        </section>

      </main>

    </div>
  )
}
