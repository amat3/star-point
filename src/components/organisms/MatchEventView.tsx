'use client'

import { useState, useTransition } from 'react'
import styled from '@emotion/styled'
import { useRouter } from 'next/navigation'
import { Pencil, UserMinus, X } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../atoms/Button'
import ConfirmDialog from '../molecules/ConfirmDialog'
import Content from '../molecules/Content'
import EventHeroCard from '../molecules/EventHeroCard'
import EventIntro from '../molecules/EventIntro'
import JoinBar from '../molecules/JoinBar'
import PlayerList, { type PlayerListItem } from '../molecules/PlayerList'
import { EditPartidoDialog } from '@/components/events/EditPartidoDialog'
import { PlayerProfileDialog } from '@/components/events/PlayerProfileDialog'
import { cancelMatchEvent, joinEvent, leaveEvent } from '@/app/actions/events'
import { MATCH_DURATION_MINUTES, missingLabel } from '@/lib/match-events'

interface MatchEventViewProps {
  eventId: string
  startTime: string
  clubId: string | null
  clubName: string | null
  maxSpots: number
  heroTitle: string
  startsAt: string
  players: PlayerListItem[]
  isJoined: boolean
  isOrganizer: boolean
  // Organizer, or an admin in the admin view
  canManage: boolean
  userRole: string
}

type PendingConfirm = { title: string; description: string; confirmLabel: string; action: () => void }

// A published match: who is in, how many are missing, and join / leave.
function MatchEventView({
  eventId, startTime, clubId, clubName, maxSpots, heroTitle, startsAt, players, isJoined, isOrganizer, canManage, userRole,
}: MatchEventViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)

  const missing = Math.max(maxSpots - players.length, 0)
  const isFull = missing === 0

  const run = (fn: () => Promise<unknown>, success: string, then?: () => void) =>
    startTransition(async () => {
      try {
        await fn()
        toast.success(success)
        then?.()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : String(error))
      }
    })

  const handleLeave = () =>
    setPending({
      title: 'Desapuntarme del partido',
      description: '¿Seguro que quieres salir? Tu plaza quedará libre para otro jugador del grupo.',
      confirmLabel: 'Sí, desapuntarme',
      action: () => run(() => leaveEvent(eventId), 'Te has desapuntado del partido'),
    })

  const handleCancel = () =>
    setPending({
      title: 'Cancelar partido',
      description: 'Se cancelará el partido y se avisará a los jugadores apuntados.',
      confirmLabel: 'Cancelar partido',
      action: () => run(() => cancelMatchEvent(eventId), 'Partido cancelado', () => router.push('/')),
    })

  const bar = isJoined
    ? {
        label: isPending ? 'Procesando…' : 'Me borro',
        variant: 'danger' as const,
        icon: <UserMinus />,
        onClick: handleLeave,
        disabled: false,
      }
    : isFull
      ? { label: 'Partido completo', variant: 'outline' as const, icon: undefined, onClick: undefined, disabled: true }
      : {
          label: isPending ? 'Procesando…' : `Apuntarme · ${missingLabel(missing).toLowerCase()}`,
          variant: 'accent' as const,
          icon: undefined,
          onClick: () => run(() => joinEvent(eventId), 'Te has apuntado al partido'),
          disabled: false,
        }

  return (
    <>
      <EditPartidoDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        eventId={eventId}
        startTime={startTime}
        clubId={clubId}
        maxSpots={maxSpots}
      />
      <PlayerProfileDialog
        userId={selectedProfileId}
        userRole={userRole}
        open={selectedProfileId !== null}
        onOpenChange={(open) => { if (!open) setSelectedProfileId(null) }}
      />
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => { if (!open) setPending(null) }}
        title={pending?.title ?? ''}
        description={pending?.description ?? ''}
        confirmLabel={pending?.confirmLabel}
        onConfirm={() => pending?.action()}
      />

      <EventIntro
        eyebrow="Partido"
        title={isFull ? 'Partido completo' : 'Se buscan jugadores'}
        subtitle={isFull ? 'Ya estáis todos. ¡A jugar!' : `${missingLabel(missing)} para completar el partido.`}
      />

      <Body $hasBar={!isOrganizer}>
        <EventHeroCard
          title={heroTitle}
          startsAt={startsAt}
          venue={clubName}
          statusLabel={isFull ? 'Completo' : 'Abierto'}
          durationMinutes={MATCH_DURATION_MINUTES}
          courts={1}
          players="4"
        />

        <PlayerList title="Quién juega" players={players} totalSlots={maxSpots} onSelect={setSelectedProfileId} />

        {canManage && (
          <Manage aria-label="Gestionar partido">
            <Button type="button" $variant="primary" $size="lg" onClick={() => setEditOpen(true)}>
              <Pencil />
              Editar partido
            </Button>
            <Button type="button" $variant="warn" $size="lg" onClick={handleCancel}>
              <X />
              Cancelar partido
            </Button>
          </Manage>
        )}
      </Body>

      {!isOrganizer && <JoinBar {...bar} disabled={isPending || bar.disabled} />}
    </>
  )
}

// Room for the fixed JoinBar when there is one
const Body = styled(Content, {
  shouldForwardProp: (prop) => prop !== '$hasBar',
})<{ $hasBar: boolean }>`
  ${({ $hasBar, theme }) =>
    $hasBar
      ? `padding-bottom: calc(${theme.layout.tabBarHeight} + env(safe-area-inset-bottom) + ${theme.layout.joinBarHeight});`
      : ''}
`

const Manage = styled.section`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

export default MatchEventView
