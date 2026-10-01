'use client'

import { useMemo, useState, useTransition } from 'react'
import styled from '@emotion/styled'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RefreshCw, Send } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../atoms/Button'
import Card from '../atoms/Card'
import CourtCard from '../molecules/CourtCard'
import EmptyState from '../molecules/EmptyState'
import JoinBar from '../molecules/JoinBar'
import RoundTabs from '../molecules/RoundTabs'
import { saveAllRounds, type DrawCourts } from '@/app/actions/mixing-generator'
import {
  generateEventRounds,
  summarizeRounds,
  type ExclusionRule,
  type MixingConfig,
  type MixingParticipant,
  type RoundProposal,
} from '@/lib/mixing-algorithm'
import { toCourtPlayer } from '@/lib/event-draw'

// Rotation always comes first; level and position only break ties, so there is
// never a reason to switch them off.
const CONFIG: MixingConfig = { genderMode: 'open', prioritizeLevel: true, forcePosition: true }

// Admin preview: levels are shown
const asCourtPlayer = (p: MixingParticipant) =>
  toCourtPlayer(
    p.id,
    { full_name: p.full_name, avatar_url: p.avatar_url ?? null, court_position: p.court_position, rating: p.rating },
    true
  )

interface EventGeneratorProps {
  eventId: string
  participants: MixingParticipant[]
  maxSpots: number
  rounds: number
  exclusions: ExclusionRule[]
  // Courts of the event's club, in display order; empty when the event has no club
  clubCourts: { id: string; name: string }[]
}

function EventGenerator({ eventId, participants, maxSpots, rounds, exclusions, clubCourts }: EventGeneratorProps) {
  const router = useRouter()
  const [isSaving, startTransition] = useTransition()

  const courtsNeeded = Math.floor(maxSpots / 4)
  const missingPlayers = Math.max(maxSpots - participants.length, 0)
  const hasClub = clubCourts.length > 0

  // "Pistas de hoy": the first N courts of the club by default
  const [selected, setSelected] = useState<string[]>(() => clubCourts.slice(0, courtsNeeded).map(c => c.id))
  const [proposals, setProposals] = useState<RoundProposal[]>([])
  const [activeRound, setActiveRound] = useState(1)

  const orderedSelection = clubCourts.filter(c => selected.includes(c.id))
  const courtsReady = !hasClub || orderedSelection.length === courtsNeeded
  const canGenerate = missingPlayers === 0 && courtsReady

  const summary = useMemo(() => summarizeRounds(proposals), [proposals])

  const toggleCourt = (id: string) =>
    setSelected(prev => (prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]))

  const courtFor = (courtNumber: number) => orderedSelection[courtNumber - 1]

  function handleGenerate() {
    if (!canGenerate) return
    try {
      // The algorithm mutates its working copy: give it a clone
      const working: MixingParticipant[] = JSON.parse(JSON.stringify(participants))
      const result = generateEventRounds(working, { ...CONFIG, exclusions }, rounds)
      setProposals(result)
      setActiveRound(1)
    } catch (error) {
      toast.error(`No se ha podido generar: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  function handlePublish() {
    startTransition(async () => {
      try {
        const courts: DrawCourts = {}
        orderedSelection.forEach((court, index) => { courts[index + 1] = court })
        await saveAllRounds(
          eventId,
          proposals.map((proposal, index) => ({ matches: proposal.matches, roundNumber: index + 1 })),
          courts
        )
        toast.success('Sorteo publicado')
        router.push(`/events/${eventId}`)
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error al publicar el sorteo')
      }
    })
  }

  const active = proposals.find((_, index) => index + 1 === activeRound)
  const matchCount = proposals.flatMap(p => p.matches).length

  return (
    <>
      {missingPlayers > 0 && (
        <Notice>
          Faltan {missingPlayers} {missingPlayers === 1 ? 'jugador' : 'jugadores'} para completar el evento. Añade jugadores
          o invitados desde <Link href={`/events/${eventId}`}>el evento</Link> antes de generar.
        </Notice>
      )}

      <Card>
        <CardTitle>Pistas de hoy</CardTitle>
        {hasClub ? (
          <>
            <Hint>
              Elige {courtsNeeded} {courtsNeeded === 1 ? 'pista' : 'pistas'} ({orderedSelection.length}/{courtsNeeded}). La primera
              será la pista 1 del sorteo.
            </Hint>
            <Chips>
              {clubCourts.map(court => (
                <Chip
                  key={court.id}
                  type="button"
                  aria-pressed={selected.includes(court.id)}
                  onClick={() => toggleCourt(court.id)}
                >
                  {court.name}
                </Chip>
              ))}
            </Chips>
          </>
        ) : (
          <Hint>
            El evento no tiene club asignado, así que las pistas quedarán por asignar. Puedes elegir el club editando{' '}
            <Link href={`/events/${eventId}`}>el evento</Link>.
          </Hint>
        )}

        <Button type="button" $size="lg" disabled={!canGenerate} onClick={handleGenerate}>
          <RefreshCw />
          {proposals.length > 0 ? 'Volver a generar' : 'Generar sorteo'}
        </Button>
      </Card>

      {proposals.length > 0 && (
        <>
          <Summary>
            <strong>{summary.reMeetings}</strong> {summary.reMeetings === 1 ? 'reencuentro' : 'reencuentros'} en el evento
            {summary.warnings > 0 && (
              <> · <strong>{summary.warnings}</strong> {summary.warnings === 1 ? 'aviso' : 'avisos'}</>
            )}
          </Summary>

          <RoundTabs rounds={proposals.map((_, index) => index + 1)} active={activeRound} onChange={setActiveRound} />

          {active?.matches.map(match => (
            <CourtCard
              key={match.courtNumber}
              title={courtFor(match.courtNumber)?.name ?? `Pista ${match.courtNumber}`}
              teamA={match.pairA.map(asCourtPlayer)}
              teamB={match.pairB.map(asCourtPlayer)}
              footer={match.warning ? <Warning>{match.warning}</Warning> : undefined}
            />
          ))}

          {active && active.leftovers.length > 0 && (
            <EmptyState>
              Sin pista en esta ronda: {active.leftovers.map(p => p.full_name).join(', ')}.
            </EmptyState>
          )}

          <JoinBar
            label={isSaving ? 'Publicando…' : `Publicar sorteo · ${matchCount} partidos`}
            variant="primary"
            icon={<Send />}
            disabled={isSaving}
            onClick={handlePublish}
          />
        </>
      )}
    </>
  )
}

const Notice = styled.p`
  margin: 0;
  padding: 0.875rem 1rem;
  border: 1px dashed ${({ theme }) => theme.colors.coral};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.coralTint};
  color: ${({ theme }) => theme.colors.ink};
  font-size: 0.875rem;

  a {
    color: ${({ theme }) => theme.colors.forest};
    font-weight: 700;
  }
`

const CardTitle = styled.h2`
  margin: 0;
  padding: 0;
  border: 0;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.0625rem;
  font-weight: 700;
`

const Hint = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.8125rem;

  a {
    color: ${({ theme }) => theme.colors.forest};
    font-weight: 700;
  }
`

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`

const Chip = styled.button`
  padding: 0.5rem 0.875rem;
  border: 1px solid ${({ theme }) => theme.colors.fieldBorder};
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.field};
  color: ${({ theme }) => theme.colors.ink};
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;

  &[aria-pressed='true'] {
    border-color: ${({ theme }) => theme.colors.forest};
    background: ${({ theme }) => theme.colors.forest};
    color: ${({ theme }) => theme.colors.onForest};
  }
`

const Summary = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.8125rem;

  strong {
    color: ${({ theme }) => theme.colors.forest};
  }
`

const Warning = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.danger};
  font-size: 0.75rem;
`

export default EventGenerator
