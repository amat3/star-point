'use client'

import { useState } from 'react'
import styled from '@emotion/styled'
import { toast } from 'sonner'
import Button from '@/components/atoms/Button'
import Input from '@/components/atoms/Input'
import Dialog from '@/components/molecules/Dialog'
import Field from '@/components/molecules/Field'
import { addGuestToMatch } from '@/app/actions/events'

interface AddGuestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
}

// The organizer of a match adds a player from outside the group, by name.
export function AddGuestDialog({ open, onOpenChange, eventId }: AddGuestDialogProps) {
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    try {
      await addGuestToMatch(eventId, name)
      toast.success('Jugador añadido')
      setName('')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo añadir el jugador')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Añadir jugador">
      <Form onSubmit={onSubmit}>
        <Field label="Nombre" htmlFor="guest-name" hint="Alguien de fuera del grupo: ocupará una plaza del partido.">
          <Input id="guest-name" value={name} onChange={e => setName(e.target.value)} maxLength={40} autoComplete="off" />
        </Field>
        <Button type="submit" $size="lg" disabled={isLoading || name.trim().length < 2}>
          {isLoading ? 'Añadiendo…' : 'Añadir jugador'}
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
