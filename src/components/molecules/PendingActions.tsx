'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../atoms/Button'
import PendingActionCard from './PendingActionCard'
import { confirmMatch, type PendingAction } from '@/app/actions/matches'
// Legacy dialog (Tailwind) until the Dialog molecule exists.
import { EditMatchDialog } from '@/components/matches/dialogs/EditMatchDialog'
import type { Match } from '@/types'
import { SAMPLE_ID_PREFIX } from '@/lib/sample-pending-actions'

// Results to record come before results to confirm (stable sort keeps the original order within each group).
const sortByKind = (actions: PendingAction[]) =>
  [...actions].sort((a, b) => Number(a.kind === 'confirm') - Number(b.kind === 'confirm'))

function PendingActions({ actions }: { actions: PendingAction[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())
  const [recording, setRecording] = useState<PendingAction | null>(null)

  const handleConfirm = (id: string) => {
    // Samples only preview the "confirmed" state; they never hit the database.
    if (id.startsWith(SAMPLE_ID_PREFIX)) return setDoneIds(prev => new Set(prev).add(id))
    setBusyId(id)
    startTransition(async () => {
      try {
        const result = await confirmMatch(id)
        if (!result.success) throw new Error(result.error)
        setDoneIds(prev => new Set(prev).add(id))
        // Let the "Confirmado" state be seen before the card leaves the list.
        setTimeout(() => router.refresh(), 1200)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al confirmar el partido')
      } finally {
        setBusyId(null)
      }
    })
  }

  return (
    <>
      {sortByKind(actions).map(a => (
        <PendingActionCard
          key={a.id}
          when={a.when}
          title={a.kind === 'confirm' ? 'Confirma el resultado' : 'Introduce el resultado'}
          description={
            a.kind === 'confirm'
              ? `Tu partido${a.partnerName ? ` con ${a.partnerName}` : ''} aún espera tu visto bueno.`
              : `Anota el marcador de tu partido${a.partnerName ? ` con ${a.partnerName}` : ''}.`
          }
          myTeam={a.myTeam}
          opponents={a.opponents}
          myGames={a.games ? String(a.games.mine) : '--'}
          theirGames={a.games ? String(a.games.theirs) : '--'}
          context={a.courtLabel}
          action={
            a.kind === 'confirm' ? (
              doneIds.has(a.id) ? (
                <Button $variant="accent" $size="lg" disabled>
                  <Check />
                  Confirmado
                </Button>
              ) : (
                <Button $variant="accent" $size="lg" disabled={isPending && busyId === a.id} onClick={() => handleConfirm(a.id)}>
                  <Check />
                  {isPending && busyId === a.id ? 'Confirmando…' : 'Confirmar resultado'}
                </Button>
              )
            ) : (
              <Button $variant="accent" $size="lg" onClick={() => a.id.startsWith(SAMPLE_ID_PREFIX) ? toast.info('Tarjeta de ejemplo: no hace nada') : setRecording(a)}>
                <Pencil />
                Introducir resultado
              </Button>
            )
          }
        />
      ))}

      {recording && (
        <EditMatchDialog
          match={recording.match as unknown as Match}
          open
          onOpenChange={(open) => {
            if (!open) {
              setRecording(null)
              router.refresh()
            }
          }}
        />
      )}
    </>
  )
}

export default PendingActions
