'use client'

import { useState, useTransition } from 'react'
import styled from '@emotion/styled'
import { useRouter } from 'next/navigation'
import { Check, MapPin, Pencil, Shuffle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Badge from '../atoms/Badge'
import Button from '../atoms/Button'
import Select from '../atoms/Select'
import ConfirmDialog from '../molecules/ConfirmDialog'
import CourtCard from '../molecules/CourtCard'
import Dialog from '../molecules/Dialog'
import EmptyState from '../molecules/EmptyState'
import RoundTabs from '../molecules/RoundTabs'
import { EditMatchDialog } from '@/components/matches/dialogs/EditMatchDialog'
import { confirmMatch, rotateMatchPlayers } from '@/app/actions/matches'
import { assignCourt, deleteMatch } from '@/app/actions/admin-matches'
import type { AdminEventGroup, AdminMatch } from '@/lib/admin-pending'
import type { Match } from '@/types'

interface AdminMatchesListProps {
  groups: AdminEventGroup[]
}

function AdminMatchesList({ groups }: AdminMatchesListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editing, setEditing] = useState<AdminMatch | null>(null)
  const [deleting, setDeleting] = useState<AdminMatch | null>(null)
  const [assigning, setAssigning] = useState<{ match: AdminMatch; group: AdminEventGroup } | null>(null)
  const [courtId, setCourtId] = useState('')

  // Runs a server action that returns { success, error? }, then refreshes.
  const run = (id: string, action: () => Promise<{ success: boolean; error?: string }>, success: string) => {
    setBusyId(id)
    startTransition(async () => {
      try {
        const result = await action()
        if (!result.success) throw new Error(result.error)
        toast.success(success)
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error al realizar la acción')
      } finally {
        setBusyId(null)
      }
    })
  }

  if (groups.length === 0) return <EmptyState>No hay partidos pendientes. ¡Todo al día!</EmptyState>

  return (
    <>
      {editing && (
        <EditMatchDialog
          match={editing.dialogMatch as unknown as Match}
          open
          onOpenChange={(open) => {
            if (!open) {
              setEditing(null)
              router.refresh()
            }
          }}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => { if (!open) setDeleting(null) }}
        title="Eliminar partido"
        description="¿Seguro que quieres eliminar este partido? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => deleting && run(deleting.id, () => deleteMatch(deleting.id), 'Partido eliminado')}
      />

      <Dialog
        open={assigning !== null}
        onOpenChange={(open) => { if (!open) setAssigning(null) }}
        title={assigning ? `Pista del ${assigning.match.title}` : 'Pista'}
        description="Se aplica a todas las rondas de esta pista en el evento."
        footer={
          <Button
            type="button"
            $size="lg"
            disabled={isPending}
            onClick={() => {
              if (!assigning?.match.eventId || assigning.match.courtNumber === null) return
              const { eventId, courtNumber, id } = assigning.match
              setAssigning(null)
              run(id, () => assignCourt(eventId, courtNumber, courtId || null), 'Pista actualizada')
            }}
          >
            Guardar pista
          </Button>
        }
      >
        <Select aria-label="Pista" value={courtId} onChange={e => setCourtId(e.target.value)}>
          <option value="">Sin asignar</option>
          {assigning?.group.courts.map(court => (
            <option key={court.id} value={court.id}>{court.name}</option>
          ))}
        </Select>
      </Dialog>

      {groups.map(group => (
        <EventGroupView
          key={group.eventId ?? 'none'}
          group={group}
          busyId={isPending ? busyId : null}
          onEdit={setEditing}
          onDelete={setDeleting}
          onRotate={(m) => run(m.id, () => rotateMatchPlayers(m.id), 'Parejas rotadas')}
          onConfirm={(m) => run(m.id, () => confirmMatch(m.id), '¡Partido confirmado!')}
          onAssign={(match) => {
            setCourtId('')
            setAssigning({ match, group })
          }}
        />
      ))}
    </>
  )
}

interface EventGroupViewProps {
  group: AdminEventGroup
  busyId: string | null
  onEdit: (match: AdminMatch) => void
  onDelete: (match: AdminMatch) => void
  onRotate: (match: AdminMatch) => void
  onConfirm: (match: AdminMatch) => void
  onAssign: (match: AdminMatch) => void
}

function EventGroupView({ group, busyId, onEdit, onDelete, onRotate, onConfirm, onAssign }: EventGroupViewProps) {
  const [activeRound, setActiveRound] = useState(group.rounds[0]?.number ?? 1)
  const matches = group.rounds.find(r => r.number === activeRound)?.matches ?? []

  return (
    <Group>
      <GroupHeader>
        <GroupTitle>{group.title}</GroupTitle>
        {group.subtitle && <GroupSubtitle>{group.subtitle}</GroupSubtitle>}
      </GroupHeader>

      {group.rounds.length > 1 && (
        <RoundTabs rounds={group.rounds.map(r => r.number)} active={activeRound} onChange={setActiveRound} />
      )}

      {matches.map(m => {
        const busy = busyId === m.id
        return (
          <CourtCard
            key={m.id}
            title={m.title}
            teamA={m.teamA}
            teamB={m.teamB}
            footer={
              <Footer>
                <Status>
                  {m.games ? <>Resultado <strong>{m.games.a} - {m.games.b}</strong></> : 'Sin resultado'}
                  {m.status === 'disputed' && <Badge $variant="danger">Impugnado</Badge>}
                </Status>

                {m.games && m.status === 'pending' && (
                  <Button type="button" $variant="accent" $size="md" disabled={busy} onClick={() => onConfirm(m)}>
                    <Check />
                    {busy ? 'Confirmando…' : 'Confirmar resultado'}
                  </Button>
                )}

                <Actions>
                  <Button type="button" $variant="outline" $size="icon" title="Editar resultado" aria-label="Editar resultado" onClick={() => onEdit(m)}>
                    <Pencil />
                  </Button>
                  <Button
                    type="button"
                    $variant="outline"
                    $size="icon"
                    title={m.games ? 'Solo se puede rotar antes de introducir el resultado' : 'Rotar parejas'}
                    aria-label="Rotar parejas"
                    disabled={!!m.games || busy || !m.eventId}
                    onClick={() => onRotate(m)}
                  >
                    <Shuffle />
                  </Button>
                  <Button
                    type="button"
                    $variant="outline"
                    $size="icon"
                    title={group.courts.length === 0 ? 'El evento no tiene club asignado' : 'Cambiar pista'}
                    aria-label="Cambiar pista"
                    disabled={!m.eventId || m.courtNumber === null || group.courts.length === 0}
                    onClick={() => onAssign(m)}
                  >
                    <MapPin />
                  </Button>
                  <Button type="button" $variant="danger" $size="icon" title="Eliminar partido" aria-label="Eliminar partido" onClick={() => onDelete(m)}>
                    <Trash2 />
                  </Button>
                </Actions>
              </Footer>
            }
          />
        )
      })}
    </Group>
  )
}

const Group = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
`

const GroupHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(0.5)};
`

const GroupTitle = styled.h2`
  margin: 0;
  padding: 0;
  border: 0;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: 600;
`

const GroupSubtitle = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`

const Footer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
`

const Status = styled.p`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(2)};
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSizes.md};

  strong {
    margin-left: ${({ theme }) => theme.spacing(1)};
    color: ${({ theme }) => theme.colors.forest};
    font-family: ${({ theme }) => theme.fonts.display};
    font-size: ${({ theme }) => theme.fontSizes.lg};
  }
`

const Actions = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(2)};
`

export default AdminMatchesList
