export const dynamic = 'force-dynamic'
export const revalidate = 0

import { notFound, redirect } from 'next/navigation'
import Content from '@/components/molecules/Content'
import Header from '@/components/molecules/Header'
import PageIntro from '@/components/molecules/PageIntro'
import TabBar from '@/components/molecules/TabBar'
import EventGenerator from '@/components/organisms/EventGenerator'
import { getEventMixingData } from '@/app/actions/mixing-generator'
import { requireAdmin } from '@/lib/admin'
import { isAdminView } from '@/lib/view-mode'
import { formatEventChip } from '@/lib/utils'

interface GeneratePageProps {
  params: Promise<{ id: string }>
}

export default async function GeneratePage(props: GeneratePageProps) {
  const { id } = await props.params
  const { supabase, user, profile } = await requireAdmin()

  const { data: event } = await supabase
    .from('events')
    .select('title, start_time, status, club_id, club:clubs(name)')
    .eq('id', id)
    .single()

  if (!event) notFound()
  // Once the draw is published there is nothing left to generate
  if (event.status !== 'open') redirect(`/events/${id}`)

  const { participants, max_spots, rounds, exclusions } = await getEventMixingData(id)

  const { data: courts } = event.club_id
    ? await supabase.from('courts').select('id, name').eq('club_id', event.club_id).order('position', { ascending: true })
    : { data: [] }

  const club = Array.isArray(event.club) ? event.club[0] : event.club

  return (
    <>
      <Header
        profile={profile}
        userName={profile.full_name ?? user.email?.split('@')[0] ?? 'Admin'}
        isAdmin
        adminView={await isAdminView(profile.role)}
      />
      <PageIntro
        title="Sorteo"
        subtitle={[event.title.trim(), formatEventChip(event.start_time), club?.name].filter(Boolean).join(' · ')}
      />

      <Content>
        <EventGenerator
          eventId={id}
          participants={participants}
          maxSpots={max_spots}
          rounds={rounds}
          exclusions={exclusions}
          clubCourts={courts ?? []}
        />
      </Content>

      <TabBar loggedIn />
    </>
  )
}
