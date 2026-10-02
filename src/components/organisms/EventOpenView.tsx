'use client'

import { useState, useTransition } from 'react'
import styled from '@emotion/styled'
import { Pencil, Shuffle, Trash2, UserMinus, UserPlus, UsersRound } from 'lucide-react'
import { toast } from 'sonner'
import Button, { ButtonLink } from '../atoms/Button'
import EventIntro from '../molecules/EventIntro'
import EventHeroCard from '../molecules/EventHeroCard'
import GroupProgress from '../molecules/GroupProgress'
import PlayerList, { type PlayerListItem } from '../molecules/PlayerList'
import HandSummary, { type HandCounts } from '../molecules/HandSummary'
import JoinBar from '../molecules/JoinBar'
import Content from '../molecules/Content'
import ConfirmDialog from '../molecules/ConfirmDialog'
import { MAX_RESERVES } from '@/lib/event-capacity'
import { joinEvent, leaveEvent, removeParticipant, deleteEvent, addGuestToEvent } from '@/app/actions/events'
import { EditEventDialog } from '@/components/events/EditEventDialog'
import { AddParticipantDialog } from '@/components/events/AddParticipantDialog'
import { PlayerProfileDialog } from '@/components/events/PlayerProfileDialog'
import { ShareEventButton } from '@/components/events/ShareEventButton'
import type { MixingEvent } from '@/types/events'


interface EventOpenViewProps {
  event: MixingEvent
  eyebrow: string
  heroTitle: string
  startsAt: string
  // Participants already formatted for the list, in sign-up order
  players: PlayerListItem[]
  userRole: string
}

type PendingConfirm = { title: string; description: string; confirmLabel: string; action: () => void }

function EventOpenView({ event, eyebrow, heroTitle, startsAt, players, userRole }: EventOpenViewProps) {
  const [isPending, startTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)

  const isAdmin = userRole === 'admin'
  const total = event.max_spots
  const count = players.length
  const confirmed = Math.min(count, total)
  const free = total - confirmed
  // Side counts of the confirmed players only: those are the ones to pair up
  const handCounts = players.slice(0, total).reduce<HandCounts>(
    (counts, p) => (p.hand ? { ...counts, [p.hand]: counts[p.hand] + 1 } : counts),
    { drive: 0, reves: 0, ambos: 0 }
  )
  const isJoined = event.is_joined
  const isFull = count >= total + MAX_RESERVES

  const run = (fn: () => Promise<unknown>, success?: string) =>
    startTransition(async () => {
      try {
        await fn()
        if (success) toast.success(success)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : String(error))
      }
    })

  const handleLeave = () =>
    setPending({
      title: 'Desapuntarme del evento',
      description: '¿Seguro que quieres salir? Perderás tu plaza y tendrás que volver a apuntarte si cambias de opinión.',
      confirmLabel: 'Sí, desapuntarme',
      action: () => run(() => leaveEvent(event.id), 'Te has dado de baja del evento'),
    })

  const handleRemove = (userId: string) =>
    setPending({
      title: 'Eliminar jugador',
      description: '¿Estás seguro de eliminar a este jugador del evento?',
      confirmLabel: 'Eliminar',
      action: () => run(() => removeParticipant(event.id, userId)),
    })

  const handleDelete = () =>
    setPending({
      title: 'Anular evento',
      description: '¿Estás seguro de anular este evento? Se borrarán todos los participantes.',
      confirmLabel: 'Anular evento',
      action: () => run(() => deleteEvent(event.id), 'Evento anulado'),
    })

  const bar = (() => {
    if (isJoined) {
      return {
        label: isPending ? 'Procesando…' : 'Me borro',
        variant: 'danger' as const,
        icon: <UserMinus />,
        onClick: handleLeave,
        note: undefined,
        shield: 'Tu plaza está confirmada. Si te borras, la ocupará el primero de la lista de espera.',
      }
    }
    if (isFull) {
      return { label: 'Evento completo', variant: 'outline' as const, disabled: true, note: undefined, shield: undefined }
    }
    return {
      label: isPending
        ? 'Procesando…'
        : free > 0
          ? `Apuntarme · quedan ${free} ${free === 1 ? 'plaza' : 'plazas'}`
          : 'Apuntarme a la lista de espera',
      variant: 'accent' as const,
      onClick: () => run(() => joinEvent(event.id), 'Te has apuntado al evento'),
      note: free > 0 ? `La lista de espera se activa cuando se ocupen las ${total} plazas.` : undefined,
      shield:
        free > 0
          ? 'Tu plaza queda confirmada al apuntarte. Si hay una baja, te avisamos si subes a titular.'
          : 'Entrarás en la lista de espera. Si hay una baja, te avisamos si subes a titular.',
    }
  })()

  return (
    <>
      <EditEventDialog open={editOpen} onOpenChange={setEditOpen} event={event} />
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
        eyebrow={eyebrow}
        title={event.title.trim()}
        subtitle="Partidos de nivel y cerveza garantizada."
        badge={event.is_test ? 'Prueba · No computa en ranking' : undefined}
      />

      <Body>
        <EventHeroCard
          title={heroTitle}
          startsAt={startsAt}
          statusLabel="Inscripción abierta"
          durationMinutes={event.duration_minutes}
          courts={Math.floor(total / 4)}
          players={String(total)}
        />

        <GroupProgress confirmed={confirmed} total={total} />

        <PlayerList
          title="Ya vienen"
          headerExtra={<HandSummary counts={handCounts} />}
          players={players}
          totalSlots={total}
          waitlist={{ capacity: MAX_RESERVES }}
          onSelect={setSelectedProfileId}
          onRemove={isAdmin ? handleRemove : undefined}
        />

        {isAdmin && (
          <AdminPanel aria-label="Administración del evento">
            <AdminCaption>Administrar evento</AdminCaption>
            <AdminActions>
              <AddParticipantDialog
                eventId={event.id}
                alreadyJoined={players.map(p => p.userId)}
                trigger={
                  <AdminButton $variant="primary" $size="icon" title="Añadir jugador">
                    <UserPlus />
                  </AdminButton>
                }
              />
              <AdminButton $variant="primary" $size="icon" title="Añadir invitado" onClick={() => run(() => addGuestToEvent(event.id), 'Invitado añadido')}>
                <UsersRound />
              </AdminButton>
              <AdminButtonLink href={`/admin/events/${event.id}/generate`} $variant="primary" $size="icon" title="Generar sorteo">
                <Shuffle />
              </AdminButtonLink>
              <AdminButton $variant="primary" $size="icon" title="Editar evento" onClick={() => setEditOpen(true)}>
                <Pencil />
              </AdminButton>
              <AdminButton $variant="danger" $size="icon" title="Anular evento" onClick={handleDelete}>
                <Trash2 />
              </AdminButton>
            </AdminActions>
            <ShareEventButton event={event} />
          </AdminPanel>
        )}
      </Body>

      <JoinBar {...bar} disabled={isPending || ('disabled' in bar && bar.disabled)} />
    </>
  )
}

const Body = styled(Content)`
  /* tab bar + the fixed join bar above it (its notes can take several lines) */
  padding-bottom: calc(${({ theme }) => theme.layout.tabBarHeight} + env(safe-area-inset-bottom) + ${({ theme }) => theme.layout.joinBarHeight});
`

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

const AdminActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-evenly;
  gap: 0.5rem;
`

// Admin actions: bigger, filled buttons so they stand out from the player-facing UI.
const adminSize = `
  width: 3rem;
  height: 3rem;

  svg {
    width: 20px;
    height: 20px;
  }
`

const AdminButton = styled(Button)`
  ${adminSize}
`

const AdminButtonLink = styled(ButtonLink)`
  ${adminSize}
`

export default EventOpenView
