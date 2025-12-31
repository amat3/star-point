import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ValidationList } from '@/components/dashboard/ValidationList'
import { NewMatchForm } from '@/components/matches/new-match-form'
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
  const userLevel = profile?.rating?.toFixed(2) ?? '0.00'
  const userName = profile?.full_name ?? user.email?.split('@')[0] ?? 'Jugador'
  const matchesPlayed = profile?.matches_played ?? 0
  const winRatio = profile?.win_ratio ? `${(profile.win_ratio * 100).toFixed(0)}%` : '0%' // Assuming win_ratio is decimal
  const ranking = profile?.ranking ?? '-' // Assuming ranking column

  // Fetch Pending Validation Matches
  // Logic: User is a player AND status is pending AND user is NOT creator
  const { data: pendingMatches } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'pending')
    .neq('creator_id', user.id)
    .or(`player_a1.eq.${user.id},player_a2.eq.${user.id},player_b1.eq.${user.id},player_b2.eq.${user.id}`)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Section */}
      <header className="bg-white shadow dark:bg-gray-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <Link href="/profile" className="flex items-center space-x-3 sm:space-x-4 overflow-hidden hover:opacity-80 transition-opacity">
            <Avatar className="h-12 w-12 sm:h-16 sm:w-16 border-2 border-lime-500 flex-shrink-0">
               {/* Use avatar_url if available, else fallback */}
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-lime-100 text-lime-800 text-lg sm:text-xl font-bold">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                Hola, {userName}
              </h1>
              <div className="flex items-center space-x-2">
                 <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Nivel Actual:</span>
                 <Badge className="bg-lime-500 hover:bg-lime-600 text-white text-xs sm:text-md px-2 sm:px-3 py-0.5 sm:py-1 rounded-full whitespace-nowrap">
                    {userLevel}
                 </Badge>
              </div>
            </div>
          </Link>
          {/* Quick Action for Desktop */}
          <div className="hidden md:block">
            <NewMatchForm />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        
        {/* Statistics Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nivel</CardTitle>
              <Medal className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userLevel}</div>
            </CardContent>
          </Card>
        </div>

        {/* Action Required Section */}
        <section>
          <div className="mb-4 flex items-center justify-between">
             <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Partidos por Validar
             </h2>
             {pendingMatches && pendingMatches.length > 0 && (
                <Badge variant="destructive">{pendingMatches.length}</Badge>
             )}
          </div>
          <ValidationList matches={pendingMatches || []} userId={user.id} />
        </section>

      </main>

      {/* Mobile Floating Action Button - Replaced by NewMatchForm which handles its own trigger, 
          but usually FAB needs special positioning. 
          For now, let's keep the desktop one integrated and maybe hide the mobile one or reuse the form.
          Ideally NewMatchForm accepts a custom Trigger so we can have two buttons.
          However, to keep it simple, I'll remove the manual buttons and rely on NewMatchForm.
          Wait, NewMatchForm has a fixed button style. 
          Let's assume for this step getting it working in the header is priority.
          I'll modify NewMatchForm call to be just once in the header for now, 
          or better yet, I should import NewMatchForm and use it.
      */}
      <div className="fixed bottom-6 right-6 md:hidden">
         {/* We need the form here too for mobile. 
             Ideally we refactor NewMatchForm to accept a 'children' prop as trigger.
             But I cannot edit NewMatchForm right now easily without another tool call.
             I will just put it in the header for now, the user asked for "Quick Action for Desktop" in the prompt example
             but also "Mobile Floating Action Button". 
             
             Actually, I can just render NewMatchForm again here. It's a bit redundant to have the dialog code twice DOM-wise
             but functionally correct for MVP. 
             OR I can rely on the responsive header button if visible? No, header button is hidden on mobile.
             
             I will replace the desktop button with <NewMatchForm />.
             And for the mobile FAB, I'll temporarily leave it as is or replace it too.
             Let's replace the FAB with NewMatchForm too, accepting the redundancy.
         */}
        <div className="[&>button]:h-14 [&>button]:w-14 [&>button]:rounded-full [&>button]:shadow-lg [&>button]:p-0 [&>button]:flex [&>button]:items-center [&>button]:justify-center">
            <NewMatchForm />
        </div>
      </div>
    </div>
  )
}
