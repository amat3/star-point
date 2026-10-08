'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import styled from '@emotion/styled'
import { useRouter } from 'next/navigation'
import { ArrowLeftRight, Check, Pencil, RefreshCw, Shuffle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../atoms/Button'
import CourtCard from '../molecules/CourtCard'
import EmptyState from '../molecules/EmptyState'
import ResultReviewDialog from '../molecules/ResultReviewDialog'
import RoundTabs from '../molecules/RoundTabs'
import Content from '../molecules/Content'
import ConfirmDialog from '../molecules/ConfirmDialog'
import { confirmMatch } from '@/app/actions/matches'
import { deleteEvent, reopenDraw } from '@/app/actions/events'
import { rotateMatchPairs } from '@/app/actions/mixing-generator'
import { EditEventDialog } from '@/components/events/EditEventDialog'
import { ChangeCourtDialog, type ChangeCourtTarget } from '@/components/events/ChangeCourtDialog'
import type { MixingEvent } from '@/types/events'
import { roundStartsAt } from '@/lib/utils'
import { EditMatchDialog } from '@/components/matches/dialogs/EditMatchDialog'
import type { Match } from '@/types'
import type { DrawMatch, DrawRound } from '@/types/draw'

interface EventDrawViewProps {
  event: MixingEvent
  eyebrow: string
  chip: string
  title: string
  summary: string
  rounds: DrawRound[]
  isAdmin: boolean
  // Admin: courts of the club, to change the court of a match
  clubCourts?: { id: string; name: string }[]
}

function EventDrawView({ event, eyebrow, chip, title, summary, rounds, isAdmin, clubCourts = [] }: EventDrawViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeRound, setActiveRound] = useState(rounds[0]?.number ?? 1)
  const [recording, setRecording] = useState<{ match: DrawMatch; mode: 'record' | 'correct' } | null>(null)
  const [reviewing, setReviewing] = useState<DrawMatch | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [redoOpen, setRedoOpen] = useState(false)
  const [courtTarget, setCourtTarget] = useState<ChangeCourtTarget | null>(null)
  const eventId = event.id

  // Follows the clock: the tab switches by itself when the next round starts
  // (before the event starts it stays on the first round).
  const liveRound = useRef<number | null>(null)
  useEffect(() => {
    const numbers = rounds.map(r => r.number)
    if (numbers.length === 0) return
    const tick = () => {
      const now = Date.now()
      const started = numbers.filter(n => roundStartsAt(event.start_time, event.duration_minutes, event.rounds, n).getTime() <= now)
      const current = started.length > 0 ? Math.max(...started) : numbers[0]
      if (current !== liveRound.current) {
        liveRound.current = current
        setActiveRound(current)
      }
    }
    tick()
    const timer = setInterval(tick, 15_000)
    // Phones freeze timers in the background: re-check when the app comes back
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [rounds, event.start_time, event.duration_minutes, event.rounds])

  const matches = [...(rounds.find(r => r.number === activeRound)?.matches ?? [])]
    // The viewer's own match first; the rest keep their court order.
    .sort((a, b) => Number(b.mine) - Number(a.mine))

  const handleConfirm = (id: string) => {
    setBusyId(id)
    startTransition(async () => {
      try {
        const result = await confirmMatch(id)
        if (!result.success) throw new Error(result.error)
        toast.success('¡Partido confirmado!')
        // This round is done: move on to the next one
        const next = rounds.map(r => r.number).find(n => n > activeRound)
        if (next !== undefined) setActiveRound(next)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al confirmar el partido')
      } finally {
        setBusyId(null)
      }
    })
  }

  const handleCancel = () =>
    startTransition(async () => {
      try {
        await deleteEvent(eventId)
        toast.success('Evento anulado')
        router.push('/mixing')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudo anular el evento')
      }
    })

  const handleRedo = () =>
    startTransition(async () => {
      try {
        await reopenDraw(eventId)
        toast.success('Sorteo deshecho: ya puedes editar el evento y volver a generarlo')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudo rehacer el sorteo')
      }
    })

  const handleRotate = (id: string) => {
    setBusyId(id)
    startTransition(async () => {
      try {
        await rotateMatchPairs(id)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudieron cambiar las parejas')
      } finally {
        setBusyId(null)
      }
    })
  }

  // Admin: swap partners when the four players agree on the court
  const adminFooterFor = (m: DrawMatch) => {
    if (m.status !== 'pending' || m.games) return undefined
    return (
      <CenteredAction>
        <Button $variant="outline" $size="md" disabled={isPending} onClick={() => handleRotate(m.id)}>
          <Shuffle />
          {isPending && busyId === m.id ? 'Cambiando…' : 'Cambiar parejas'}
        </Button>
      </CenteredAction>
    )
  }

  const footerFor = (m: DrawMatch) => {
    if (!m.mine) return undefined
    const score = m.games ? `${m.games.a} - ${m.games.b}` : null

    if (m.status === 'confirmed') return <Status>Resultado confirmado{score && <Score>{score}</Score>}</Status>
    if (m.status === 'expired') return <Status>Partido caducado sin resultado</Status>
    if (m.status === 'disputed') return <Status>Resultado impugnado: lo revisará un admin{score && <Score>{score}</Score>}</Status>
    if (!m.games) {
      return (
        <CenteredAction>
          <Button $variant="accent" $size="md" onClick={() => setRecording({ match: m, mode: 'record' })}>
            <Pencil />
            Introducir resultado
          </Button>
        </CenteredAction>
      )
    }
    if (m.waitingForMe) {
      return (
        <Action>
          <Score>{score}</Score>
          <Button $variant="accent" $size="md" disabled={isPending && busyId === m.id} onClick={() => setReviewing(m)}>
            <Check />
            {isPending && busyId === m.id ? 'Confirmando…' : 'Confirmar resultado'}
          </Button>
        </Action>
      )
    }
    return <Status>Esperando la confirmación del rival<Score>{score}</Score></Status>
  }

  return (
    <>
      <Intro>
        <Row>
          <Eyebrow>{eyebrow}</Eyebrow>
          <Chip>{chip}</Chip>
        </Row>
        <Title>{title}</Title>
        <Summary>{summary}</Summary>
      </Intro>

      <Body>
        <RoundTabs rounds={rounds.map(r => r.number)} active={activeRound} onChange={setActiveRound} />

        {matches.length === 0 && <EmptyState>No juegas en esta ronda.</EmptyState>}
        {matches.map(m => (
          <CourtCard
            key={m.id}
            title={m.title}
            mine={m.mine}
            teamA={m.teamA}
            teamB={m.teamB}
            headerAction={isAdmin && clubCourts.length > 0 && m.status !== 'confirmed' ? (
              <Button
                $variant="ghost"
                $size="sm"
                aria-label={`Cambiar la pista de ${m.title}`}
                onClick={() => setCourtTarget({ matchId: m.id, courtNumber: m.courtNumber, courtId: m.courtId, title: m.title })}
              >
                <ArrowLeftRight />
                Pista
              </Button>
            ) : undefined}
            footer={isAdmin ? adminFooterFor(m) : footerFor(m)}
          />
        ))}
        {!isAdmin && rounds.length === 0 && <EmptyState>Todavía no hay partidos para ti.</EmptyState>}

        {isAdmin && (
          <AdminPanel aria-label="Administración del evento">
            <AdminCaption>Administrar evento</AdminCaption>
            <Button $variant="primary" $size="lg" disabled={isPending} onClick={() => setEditOpen(true)}>
              <Pencil />
              Editar evento
            </Button>
            <SecondaryActions>
              <Button $variant="outline" $size="md" disabled={isPending} onClick={() => setRedoOpen(true)}>
                <RefreshCw />
                Rehacer
              </Button>
              <Button $variant="danger" $size="md" disabled={isPending} onClick={() => setCancelOpen(true)}>
                <Trash2 />
                Anular
              </Button>
            </SecondaryActions>
          </AdminPanel>
        )}
      </Body>

      <ChangeCourtDialog
        open={courtTarget !== null}
        onOpenChange={(open) => { if (!open) setCourtTarget(null) }}
        eventId={eventId}
        courts={clubCourts}
        target={courtTarget}
        onChanged={() => router.refresh()}
      />
      <EditEventDialog open={editOpen} onOpenChange={setEditOpen} event={event} published />

      <ConfirmDialog
        open={redoOpen}
        onOpenChange={setRedoOpen}
        title="Rehacer sorteo"
        description="Se borrarán los partidos del sorteo y el evento volverá a la inscripción para cambiar pistas, rondas o jugadores y generarlo de nuevo. Solo es posible si aún no hay resultados."
        confirmLabel="Rehacer sorteo"
        onConfirm={handleRedo}
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Anular evento"
        description="Se borrarán el sorteo, los partidos y las inscripciones. Solo es posible si ningún partido está confirmado."
        confirmLabel="Anular evento"
        onConfirm={handleCancel}
      />

      {reviewing && reviewing.games && (
        <ResultReviewDialog
          open
          onOpenChange={(open) => { if (!open) setReviewing(null) }}
          myTeam={reviewing.teamA.map(p => p.name)}
          opponents={reviewing.teamB.map(p => p.name)}
          games={{ mine: reviewing.games.a, theirs: reviewing.games.b }}
          onConfirm={() => {
            const id = reviewing.id
            setReviewing(null)
            handleConfirm(id)
          }}
          onCorrect={() => {
            const match = reviewing
            setReviewing(null)
            setRecording({ match, mode: 'correct' })
          }}
        />
      )}

      {recording && (
        <EditMatchDialog
          match={recording.match.dialogMatch as unknown as Match}
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

const Intro = styled.section`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.25rem 1.5rem 0;
`

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
`

const Eyebrow = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.ink};
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`

const Chip = styled.span`
  padding: 0.25rem 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.line};
  border-radius: ${({ theme }) => theme.radii.pill};
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.04em;
`

const Title = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.forest};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
`

const Summary = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.875rem;
`

const Body = Content

const AdminPanel = styled.section`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid ${({ theme }) => theme.colors.line};
`

const AdminCaption = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`

const Status = styled.p`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.8125rem;
`

const SecondaryActions = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
`

const CenteredAction = styled.div`
  display: flex;
  justify-content: center;
`

const Action = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const Score = styled.strong`
  color: ${({ theme }) => theme.colors.forest};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.125rem;
  font-weight: 700;
`

export default EventDrawView
