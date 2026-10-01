'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import MatchForm, { type MatchFormSubmit } from './MatchForm'
import { createMatchEvent } from '@/app/actions/events'
import { utcToMadridDateTime } from '@/lib/utils'

function PublishMatch({ clubs }: { clubs: { id: string; name: string }[] }) {
  const router = useRouter()

  async function handleSubmit(values: MatchFormSubmit) {
    try {
      const { id } = await createMatchEvent(values)
      toast.success('Partido publicado: avisamos al grupo')
      router.push(`/events/${id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se ha podido publicar el partido')
    }
  }

  return (
    <MatchForm
      clubs={clubs}
      initial={{
        club_id: clubs.find(c => c.name === 'Padel Indoor')?.id ?? '',
        date: utcToMadridDateTime(new Date().toISOString()).date,
        time: '20:00',
        needed: 2,
      }}
      submitLabel="Publicar partido"
      submittingLabel="Publicando…"
      onSubmit={handleSubmit}
    />
  )
}

export default PublishMatch
