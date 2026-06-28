import { createClient } from '@/utils/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { EventCard } from '@/components/events/EventCard'
import { ShareEventButton } from '@/components/events/ShareEventButton'
import { RealtimeRefresher } from '@/components/dashboard/RealtimeRefresher'
import { MixingEvent } from '@/types/events'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EventPageProps {
  params: Promise<{ id: string }>
}

export default async function EventPage(props: EventPageProps) {
  const params = await props.params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  // 1. Fetch Event
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !event) {
    notFound()
  }

  // 2. Fetch Participants
  const { data: rawParticipants } = await supabase
       .from('event_participants')
       .select('user_id, joined_at')
       .eq('event_id', params.id)
       .order('joined_at', { ascending: true })

  // 3. Fetch Profiles for Participants
  type EventProfile = { id: string; full_name?: string | null; avatar_url?: string | null }
  const userIds = rawParticipants?.map((p) => p.user_id) || []
  const profilesMap: Record<string, EventProfile> = {}

  if (userIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds)

        profiles?.forEach((p) => {
            profilesMap[p.id] = p
        })
  }

  const isJoined = userIds.includes(user.id)

  const formattedParticipants = rawParticipants?.map((p) => ({
        user_id: p.user_id,
        full_name: profilesMap[p.user_id]?.full_name || 'Jugador',
        avatar_url: profilesMap[p.user_id]?.avatar_url
    })) || []

  // 4. Build MixingEvent object
  const fullEvent: MixingEvent = {
        ...event,
        rounds: event.rounds || 1,
        duration_minutes: event.duration_minutes || 90,
        participants_count: rawParticipants?.length || 0,
        participants: formattedParticipants,
        is_joined: isJoined
  }

  // 5. Get User Role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  const userRole = profile?.role || 'player'

  return (
    <div className="container mx-auto max-w-md py-8 px-4 space-y-8 animate-in fade-in duration-500">
      <RealtimeRefresher />
        <div className="flex items-center gap-4 mb-6">
            <Link href="/dashboard">
                <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                    <ArrowLeft className="h-6 w-6 text-gray-500" />
                </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Detalle del Evento</h1>
        </div>
        
        <div>
            <EventCard event={fullEvent} userId={user.id} userRole={userRole} />
        </div>
        
        {userRole === 'admin' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                <div className="border-b border-gray-100 dark:border-gray-700 pb-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Panel de Admin</h3>
                    <p className="text-sm text-gray-500">Gestiona y difunde este evento.</p>
                </div>
                
                <div className="grid gap-3">
                    <ShareEventButton event={fullEvent} />
                </div>
            </div>
        )}
    </div>
  )
}
