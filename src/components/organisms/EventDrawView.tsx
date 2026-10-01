'use client'

import { useState, useTransition } from 'react'
import styled from '@emotion/styled'
import { useRouter } from 'next/navigation'
import { Check, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../atoms/Button'
import CourtCard from '../molecules/CourtCard'
import EmptyState from '../molecules/EmptyState'
import ResultReviewDialog from '../molecules/ResultReviewDialog'
import RoundTabs from '../molecules/RoundTabs'
import Content from '../molecules/Content'
import { confirmMatch } from '@/app/actions/matches'
// Legacy dialog (Tailwind) until the Dialog molecule exists.
import { EditMatchDialog } from '@/components/matches/dialogs/EditMatchDialog'
import type { Match } from '@/types'
import type { DrawMatch, DrawRound } from '@/types/draw'

interface EventDrawViewProps {
  eyebrow: string
  chip: string
  title: string
  summary: string
  rounds: DrawRound[]
  isAdmin: boolean
}

function EventDrawView({ eyebrow, chip, title, summary, rounds, isAdmin }: EventDrawViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeRound, setActiveRound] = useState(rounds[0]?.number ?? 1)
  const [recording, setRecording] = useState<{ match: DrawMatch; mode: 'record' | 'correct' } | null>(null)
  const [reviewing, setReviewing] = useState<DrawMatch | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

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
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al confirmar el partido')
      } finally {
        setBusyId(null)
      }
    })
  }

  const footerFor = (m: DrawMatch) => {
    if (!m.mine) return undefined
    const score = m.games ? `${m.games.a} - ${m.games.b}` : null

    if (m.status === 'confirmed') return <Status>Resultado confirmado{score && <Score>{score}</Score>}</Status>
    if (m.status === 'expired') return <Status>Partido caducado sin resultado</Status>
    if (m.status === 'disputed') return <Status>Resultado impugnado: lo revisará un admin{score && <Score>{score}</Score>}</Status>
    if (!m.games) {
      return (
        <Button $variant="accent" $size="md" onClick={() => setRecording({ match: m, mode: 'record' })}>
          <Pencil />
          Introducir resultado
        </Button>
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
            footer={footerFor(m)}
          />
        ))}
        {!isAdmin && rounds.length === 0 && <EmptyState>Todavía no hay partidos para ti.</EmptyState>}
      </Body>

      {reviewing && reviewing.games && (
        <ResultReviewDialog
          open
          onOpenChange={(open) => { if (!open) setReviewing(null) }}
          myTeam={reviewing.teamA.map(p => p.name.split(' ')[0])}
          opponents={reviewing.teamB.map(p => p.name.split(' ')[0])}
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

const Status = styled.p`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.8125rem;
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
