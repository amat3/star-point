'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Dialog from '@/components/molecules/Dialog'
import MatchForm, { type MatchFormSubmit } from './MatchForm'
import { updateMatchEvent } from '@/app/actions/events'
import { createClient } from '@/utils/supabase/client'
import { neededForSpots } from '@/lib/match-events'
import { utcToMadridDateTime } from '@/lib/utils'

interface EditPartidoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  startTime: string
  clubId: string | null
  maxSpots: number
  notes: string | null
}

export function EditPartidoDialog({ open, onOpenChange, eventId, startTime, clubId, maxSpots, notes }: EditPartidoDialogProps) {
  const router = useRouter()
  const [clubs, setClubs] = useState<{ id: string; name: string }[] | null>(null)

  useEffect(() => {
    if (!open) return
    createClient()
      .from('clubs')
      .select('id, name')
      .order('name')
      .then(({ data }) => setClubs(data ?? []))
  }, [open])

  async function handleSubmit(values: MatchFormSubmit) {
    try {
      await updateMatchEvent(eventId, values)
      toast.success('Partido actualizado')
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se ha podido actualizar el partido')
    }
  }

  const { date, time } = utcToMadridDateTime(startTime)

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Editar partido">
      {clubs && (
        <MatchForm
          clubs={clubs}
          initial={{
            club_id: clubId ?? '',
            date,
            time,
            needed: Math.min(Math.max(neededForSpots(maxSpots), 1), 3) as 1 | 2 | 3,
            notes: notes ?? '',
          }}
          submitLabel="Guardar cambios"
          submittingLabel="Guardando…"
          onSubmit={handleSubmit}
        />
      )}
    </Dialog>
  )
}
