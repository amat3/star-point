'use client'

import { useState, useEffect, useMemo } from 'react'
import styled from '@emotion/styled'
import { Check, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import Button from '@/components/atoms/Button'
import Input from '@/components/atoms/Input'
import Dialog from '@/components/molecules/Dialog'
import { addParticipant } from '@/app/actions/events'
import { createClient } from '@/utils/supabase/client'
import { toTitleCase } from '@/lib/utils'

interface AddParticipantDialogProps {
  eventId: string
  alreadyJoined: string[]
  disabled?: boolean
  // Custom trigger (new design system); defaults to a plain icon button
  trigger?: React.ReactElement
}

type Player = { id: string; full_name: string | null }

export function AddParticipantDialog({ eventId, alreadyJoined, disabled, trigger }: AddParticipantDialogProps) {
  const [open, setOpen] = useState(false)
  const [players, setPlayers] = useState<Player[]>([])
  const [search, setSearch] = useState('')
  const [addingId, setAddingId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSearch('')
    const supabase = createClient()
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('is_guest', false)
      .order('full_name')
      .then(({ data }) => {
        if (data) setPlayers(data.filter(p => !alreadyJoined.includes(p.id)))
      })
  }, [open, alreadyJoined])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return term ? players.filter(p => (p.full_name ?? '').toLowerCase().includes(term)) : players
  }, [players, search])

  const handleSelect = async (player: Player) => {
    setAddingId(player.id)
    try {
      await addParticipant(eventId, player.id)
      toast.success(`${toTitleCase(player.full_name)} añadido al evento`)
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al añadir jugador')
    } finally {
      setAddingId(null)
    }
  }

  const triggerNode = trigger ?? (
    <Button type="button" $variant="ghost" $size="icon" disabled={disabled} title="Añadir jugador">
      <UserPlus />
    </Button>
  )

  return (
    <>
      {/* The trigger opens the dialog without losing its own handlers */}
      <TriggerWrapper onClick={() => !disabled && setOpen(true)}>{triggerNode}</TriggerWrapper>

      <Dialog open={open} onOpenChange={setOpen} title="Añadir jugador">
        <Input placeholder="Buscar jugador…" value={search} onChange={e => setSearch(e.target.value)} autoFocus />
        <List>
          {visible.length === 0 && <Empty>No hay jugadores disponibles.</Empty>}
          {visible.map(player => (
            <Option key={player.id} type="button" disabled={addingId !== null} onClick={() => handleSelect(player)}>
              {toTitleCase(player.full_name)}
              {addingId === player.id && <Check />}
            </Option>
          ))}
        </List>
      </Dialog>
    </>
  )
}

const TriggerWrapper = styled.span`
  display: contents;
`

const List = styled.div`
  display: flex;
  max-height: 50dvh;
  flex-direction: column;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => theme.colors.line};
  border-radius: ${({ theme }) => theme.radii.md};
`

const Option = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 2.75rem;
  padding: ${({ theme }) => theme.spacing(0, 4)};
  border: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.line};
  background: transparent;
  color: inherit;
  font-family: inherit;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  text-align: left;
  cursor: pointer;

  &:last-of-type {
    border-bottom: 0;
  }
  &:disabled {
    opacity: 0.5;
  }
  svg {
    width: 1rem;
    height: 1rem;
  }
`

const Empty = styled.p`
  margin: 0;
  padding: ${({ theme }) => theme.spacing(4)};
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSizes.base};
  text-align: center;
`
