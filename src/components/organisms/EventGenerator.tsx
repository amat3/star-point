'use client'

import { useMemo, useState, useTransition } from 'react'
import styled from '@emotion/styled'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RefreshCw, Send, ShieldBan } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../atoms/Button'
import Card from '../atoms/Card'
import CourtCard from '../molecules/CourtCard'
import EmptyState from '../molecules/EmptyState'
import JoinBar from '../molecules/JoinBar'
import RoundTabs from '../molecules/RoundTabs'
import DrawRulesEditor from '../events/DrawRulesEditor'
import { saveAllRounds } from '@/app/actions/mixing-generator'
import type { DrawCourts } from '@/lib/draw-publish'
import { ruleProblems, rulesToConfig, type DrawRule } from '@/lib/draw-rules'
import {
  DEFAULT_MIXING_CONFIG,
  brokenRules,
  generateEventRounds,
  summarizeRounds,
  type ExclusionRule,
  type GenderMode,
  type MatchProposal,
  type MixingParticipant,
  type RoundProposal,
} from '@/lib/mixing-algorithm'
import { toCourtPlayer } from '@/lib/event-draw'
import { missingLabel } from '@/lib/match-events'


// Admin preview: levels are shown
const asCourtPlayer = (p: MixingParticipant) =>
  toCourtPlayer(
    p.id,
    { full_name: p.full_name, avatar_url: p.avatar_url ?? null, court_position: p.court_position, rating: p.rating },
    true
  )

const ROUND_FORMATS: { mode: GenderMode; label: string }[] = [
  { mode: 'open', label: 'Libre' },
  { mode: 'mixed', label: 'Mixta' },
  { mode: 'separated', label: 'Separada' },
]

const isWoman = (p: MixingParticipant) => p.gender === 'femenino'
const hasGender = (p: MixingParticipant) => p.gender === 'femenino' || p.gender === 'masculino'

// What a court of a round with a gender format turned out to be, so the admin can check it at a glance
function courtFormat(match: MatchProposal): string {
  const women = [match.player1, match.player2, match.player3, match.player4].filter(isWoman).length
  if (women === 4) return 'Femenina'
  if (women === 0) return 'Masculina'
  if (women === 2) {
    return [match.pairA, match.pairB].every(pair => pair.filter(isWoman).length === 1) ? 'Mixta' : 'Chicas contra chicos'
  }
  return women === 3 ? '3 chicas y 1 chico' : '1 chica y 3 chicos'
}

interface EventGeneratorProps {
  eventId: string
  participants: MixingParticipant[]
  maxSpots: number
  rounds: number
  exclusions: ExclusionRule[]
  // Rules of this event's draw (fixed pairs, men who may complete the women's court), as saved
  rules: DrawRule[]
  // Courts of the event's club, in display order; empty when the event has no club
  clubCourts: { id: string; name: string }[]
}

function EventGenerator({ eventId, participants, maxSpots, rounds, exclusions, rules: savedRules, clubCourts }: EventGeneratorProps) {
  const router = useRouter()
  const [isSaving, startTransition] = useTransition()

  const courtsNeeded = Math.floor(maxSpots / 4)
  const missingPlayers = Math.max(maxSpots - participants.length, 0)
  const hasClub = clubCourts.length > 0

  // "Pistas de hoy": the first N courts of the club by default
  const [selected, setSelected] = useState<string[]>(() => clubCourts.slice(0, courtsNeeded).map(c => c.id))
  const [proposals, setProposals] = useState<RoundProposal[]>([])
  const [activeRound, setActiveRound] = useState(1)
  // Gender format of each round; "Libre" is the usual draw
  const [roundModes, setRoundModes] = useState<GenderMode[]>(() => Array.from({ length: rounds }, () => 'open'))
  const [rules, setRules] = useState(savedRules)
  const [generating, setGenerating] = useState(false)

  const orderedSelection = clubCourts.filter(c => selected.includes(c.id))
  const courtsReady = !hasClub || orderedSelection.length === courtsNeeded
  const gendered = roundModes.some(mode => mode !== 'open')
  const showRules = gendered || rules.length > 0
  // A round with a gender format, or a rule, needs to know everyone's: guests start without one
  const withoutGender = participants.filter(p => !hasGender(p))
  const missingGender = showRules && withoutGender.length > 0
  const women = participants.filter(isWoman).length
  // The rules hold "sí o sí": anything that keeps them from fitting is said before generating
  const problems = useMemo(
    () => (showRules && !missingGender && missingPlayers === 0 ? ruleProblems(participants, roundModes, rules, exclusions) : []),
    [showRules, missingGender, missingPlayers, participants, roundModes, rules, exclusions]
  )
  const canGenerate = missingPlayers === 0 && courtsReady && !missingGender && problems.length === 0 && !generating

  const summary = useMemo(() => summarizeRounds(proposals), [proposals])
  const nameOf = (id: string) => participants.find(p => p.id === id)?.full_name ?? 'Jugador'
  const broken = useMemo(() => {
    const { fixedPairs, womenCourtMen } = rulesToConfig(rules)
    return brokenRules(proposals, roundModes, fixedPairs, womenCourtMen)
  }, [proposals, roundModes, rules])

  const toggleCourt = (id: string) =>
    setSelected(prev => (prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]))

  const setRoundMode = (index: number, mode: GenderMode) => {
    setRoundModes(prev => prev.map((current, i) => (i === index ? mode : current)))
    // A draw made with the previous format must not be published by mistake
    setProposals([])
  }

  const changeRules = (next: DrawRule[]) => {
    setRules(next)
    setProposals([])
  }

  const courtFor = (courtNumber: number) => orderedSelection[courtNumber - 1]

  function handleGenerate() {
    if (!canGenerate) return
    setGenerating(true)
    // With rules a draw takes a moment: let "Generando…" paint before the work blocks the page
    setTimeout(() => {
      try {
        // The algorithm mutates its working copy: give it a clone
        const working: MixingParticipant[] = JSON.parse(JSON.stringify(participants))
        const result = generateEventRounds(
          working,
          { ...DEFAULT_MIXING_CONFIG, exclusions, roundGenderModes: roundModes, ...rulesToConfig(rules) },
          rounds
        )
        setProposals(result)
        setActiveRound(1)
      } catch (error) {
        toast.error(`No se ha podido generar: ${error instanceof Error ? error.message : String(error)}`)
      } finally {
        setGenerating(false)
      }
    }, 30)
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
  const activeGendered = roundModes[activeRound - 1] !== 'open'
  const matchCount = proposals.flatMap(p => p.matches).length

  return (
    <>
      {missingPlayers > 0 && (
        <Notice>
          {missingLabel(missingPlayers)} para completar el evento. Añade jugadores
          o invitados desde <Link href={`/events/${eventId}`}>el evento</Link> antes de generar.
        </Notice>
      )}

      {missingGender && (
        <Notice>
          Para las rondas mixtas o separadas y las reglas del sorteo falta el género de {withoutGender.map(p => p.full_name).join(', ')}. A los
          invitados se lo pones tocando su nombre en <Link href={`/events/${eventId}`}>el evento</Link>; los jugadores lo
          eligen en su perfil.
        </Notice>
      )}

      {problems.length > 0 && (
        <Notice as="div">
          Antes de generar:
          <ul>
            {problems.map(problem => <li key={problem}>{problem}</li>)}
          </ul>
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

        <CardTitle>Formato de las rondas</CardTitle>
        <Hint>
          Mixta: parejas de chica y chico. Separada: chicas con chicas y chicos con chicos; si las chicas no llenan su
          última pista, la completan chicos.
        </Hint>
        {roundModes.map((mode, index) => (
          <RoundRow key={index}>
            <RoundLabel id={`round-format-${index + 1}`}>Ronda {index + 1}</RoundLabel>
            <Chips role="group" aria-labelledby={`round-format-${index + 1}`}>
              {ROUND_FORMATS.map(format => (
                <Chip
                  key={format.mode}
                  type="button"
                  aria-pressed={mode === format.mode}
                  onClick={() => setRoundMode(index, format.mode)}
                >
                  {format.label}
                </Chip>
              ))}
            </Chips>
          </RoundRow>
        ))}
        {gendered && (
          <Hint>
            Titulares: {women} {women === 1 ? 'chica' : 'chicas'} y {participants.length - women - withoutGender.length}{' '}
            {participants.length - women - withoutGender.length === 1 ? 'chico' : 'chicos'}
            {withoutGender.length > 0 && <>, {withoutGender.length} sin género</>}.
          </Hint>
        )}

        {showRules && <DrawRulesEditor eventId={eventId} starters={participants} rules={rules} onRulesChange={changeRules} />}

        <Button type="button" $size="lg" disabled={!canGenerate} onClick={handleGenerate}>
          <RefreshCw />
          {generating ? 'Generando…' : proposals.length > 0 ? 'Volver a generar' : 'Generar sorteo'}
        </Button>
        <ExclusionsLink href="/admin/exclusions">
          <ShieldBan />
          Exclusiones del sorteo
        </ExclusionsLink>
      </Card>

      {proposals.length > 0 && (
        <>
          {broken.length > 0 && (
            <Notice as="div">
              Este sorteo no cumple las reglas; vuelve a generar:
              <ul>
                {broken.map(rule => (
                  <li key={`${rule.kind}-${rule.players.join('-')}-${rule.round ?? ''}`}>
                    {rule.kind === 'pair'
                      ? `${rule.players.map(nameOf).join(' + ')} no juegan juntos.`
                      : `${nameOf(rule.players[0])} está en la pista de chicas de la ronda ${rule.round} sin estar en la lista.`}
                  </li>
                ))}
              </ul>
            </Notice>
          )}

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
              title={[courtFor(match.courtNumber)?.name ?? `Pista ${match.courtNumber}`, activeGendered && courtFormat(match)]
                .filter(Boolean)
                .join(' · ')}
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

          {/* Room so the last court is not hidden behind the fixed publish bar */}
          <BarSpace aria-hidden="true" />

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

const BarSpace = styled.div`
  height: ${({ theme }) => theme.layout.actionBarHeight};
`

const Notice = styled.p`
  margin: 0;
  padding: ${({ theme }) => theme.spacing(4, 4)};
  border: 1px dashed ${({ theme }) => theme.colors.coral};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.coralTint};
  color: ${({ theme }) => theme.colors.ink};
  font-size: ${({ theme }) => theme.fontSizes.base};

  a {
    color: ${({ theme }) => theme.colors.forestText};
    font-weight: 700;
  }

  ul {
    margin: ${({ theme }) => theme.spacing(2, 0, 0)};
    padding-left: ${({ theme }) => theme.spacing(5)};
  }
`

const CardTitle = styled.h2`
  margin: 0;
  padding: 0;
  border: 0;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: 700;
`

const Hint = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSizes.md};

  a {
    color: ${({ theme }) => theme.colors.forestText};
    font-weight: 700;
  }
`

const ExclusionsLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing(2)};
  color: ${({ theme }) => theme.colors.forestText};
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 600;

  svg {
    width: 1rem;
    height: 1rem;
  }
`

const RoundRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(2, 3)};
`

const RoundLabel = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 600;
`

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing(2)};
`

const Chip = styled.button`
  padding: ${({ theme }) => theme.spacing(2, 4)};
  border: 1px solid ${({ theme }) => theme.colors.fieldBorder};
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.field};
  color: ${({ theme }) => theme.colors.ink};
  font-family: inherit;
  font-size: ${({ theme }) => theme.fontSizes.md};
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
  font-size: ${({ theme }) => theme.fontSizes.md};

  strong {
    color: ${({ theme }) => theme.colors.forestText};
  }
`

const Warning = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.danger};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`

export default EventGenerator
