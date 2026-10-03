'use client'

import { useEffect, useState } from 'react'
import styled from '@emotion/styled'
import { toast } from 'sonner'
import Button from '@/components/atoms/Button'
import Input from '@/components/atoms/Input'
import Dialog from '@/components/molecules/Dialog'
import Field from '@/components/molecules/Field'
import { addGuestToMatch, renameMatchGuest, setMatchKnownPlayer } from '@/app/actions/events'

interface AddGuestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  // Set to rename an existing guest instead of adding a new one
  guest?: { id: string; name: string } | null
}

// The organizer of a match adds a player from outside the group, by name (or renames one).
export function AddGuestDialog({ open, onOpenChange, eventId, guest }: AddGuestDialogProps) {
  const [name, setName] = useState('')
  const renaming = !!guest

  useEffect(() => {
    if (open) setName(guest?.name ?? '')
  }, [open, guest])
  const [isLoading, setIsLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    try {
      if (guest?.id.startsWith('known-')) {
        // One of the players the organizer already has settled: its name lives in the event
        await setMatchKnownPlayer(eventId, Number(guest.id.slice('known-'.length)), name)
        toast.success('Nombre actualizado')
      } else if (guest) {
        await renameMatchGuest(eventId, guest.id, name)
        toast.success('Nombre actualizado')
      } else {
        await addGuestToMatch(eventId, name)
        toast.success('Jugador añadido')
      }
      setName('')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el jugador')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={renaming ? 'Cambiar nombre' : 'Añadir jugador'}>
      <Form onSubmit={onSubmit}>
        <Field label="Nombre" htmlFor="guest-name" hint={renaming ? undefined : 'Alguien de fuera del grupo: ocupará una plaza del partido.'}>
          <Input id="guest-name" value={name} onChange={e => setName(e.target.value)} maxLength={40} autoComplete="off" />
        </Field>
        <Button type="submit" $size="lg" disabled={isLoading || name.trim().length < 2}>
          {isLoading ? 'Guardando…' : renaming ? 'Guardar nombre' : 'Añadir jugador'}
        </Button>
      </Form>
    </Dialog>
  )
}

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`
