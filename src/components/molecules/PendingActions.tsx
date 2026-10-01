'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../atoms/Button'
import PendingActionCard from './PendingActionCard'
import ResultReviewDialog from './ResultReviewDialog'
import { confirmMatch, type PendingAction } from '@/app/actions/matches'
// Legacy dialog (Tailwind) until the Dialog molecule exists.
import { EditMatchDialog } from '@/components/matches/dialogs/EditMatchDialog'
import type { Match } from '@/types'
import { SAMPLE_ID_PREFIX } from '@/lib/sample-pending-actions'

// Results to record come before results to confirm (stable sort keeps the original order within each group).
const sortByKind = (actions: PendingAction[]) =>
  [...actions].sort((a, b) => Number(a.kind === 'confirm') - Number(b.kind === 'confirm'))

// Max delay setTimeout supports; longer waits are re-evaluated on the next refresh.
const MAX_TIMEOUT_MS = 2 ** 31 - 1

interface PendingActionsProps {
  actions: PendingAction[]
  // ISO date when the next "introducir resultado" card should appear (a round ends)
  nextRevealAt?: string | null
}

function PendingActions({ actions, nextRevealAt }: PendingActionsProps) {
  const router = useRouter()

  // New cards appear when a round ends, with no data change to trigger a
  // refresh: schedule one for that moment, and also when the tab becomes visible
  // again (timers are throttled while the phone sleeps).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    if (nextRevealAt) {
      const wait = new Date(nextRevealAt).getTime() - Date.now()
      timer = setTimeout(() => router.refresh(), Math.min(Math.max(wait, 0) + 500, MAX_TIMEOUT_MS))
    }
    const onVisible = () => { if (document.visibilityState === 'visible') router.refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [nextRevealAt, router])

  const [isPending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())
  const [recording, setRecording] = useState<{ action: PendingAction; mode: 'record' | 'correct' } | null>(null)
  // The confirm button opens a review step first: confirming cannot be undone
  const [reviewing, setReviewing] = useState<PendingAction | null>(null)

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
                <Button $variant="accent" $size="lg" disabled={isPending && busyId === a.id} onClick={() => setReviewing(a)}>
                  <Check />
                  {isPending && busyId === a.id ? 'Confirmando…' : 'Confirmar resultado'}
                </Button>
              )
            ) : (
              <Button $variant="accent" $size="lg" onClick={() => a.id.startsWith(SAMPLE_ID_PREFIX) ? toast.info('Tarjeta de ejemplo: no hace nada') : setRecording({ action: a, mode: 'record' })}>
                <Pencil />
                Introducir resultado
              </Button>
            )
          }
        />
      ))}

      {reviewing && reviewing.games && (
        <ResultReviewDialog
          open
          onOpenChange={(open) => { if (!open) setReviewing(null) }}
          myTeam={reviewing.myTeam}
          opponents={reviewing.opponents}
          games={reviewing.games}
          onConfirm={() => {
            const id = reviewing.id
            setReviewing(null)
            handleConfirm(id)
          }}
          onCorrect={() => {
            const action = reviewing
            setReviewing(null)
            if (action.id.startsWith(SAMPLE_ID_PREFIX)) return toast.info('Tarjeta de ejemplo: no hace nada')
            setRecording({ action, mode: 'correct' })
          }}
        />
      )}

      {recording && (
        <EditMatchDialog
          match={recording.action.match as unknown as Match}
          mode={recording.mode}
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
