'use client'

import { useState } from 'react'
import styled from '@emotion/styled'
import { toast } from 'sonner'
import Button from '@/components/atoms/Button'
import Select from '@/components/atoms/Select'
import Dialog from '@/components/molecules/Dialog'
import Field from '@/components/molecules/Field'
import { changeCourt } from '@/app/actions/admin-matches'

export interface ChangeCourtTarget {
  matchId: string
  courtNumber: number | null
  courtId: string | null
  title: string
}

interface ChangeCourtDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  // Courts of the event's club, in display order
  courts: { id: string; name: string }[]
  target: ChangeCourtTarget | null
  onChanged: () => void
}

// Admin, in situ: the club changed the court of a match (or of the whole night).
export function ChangeCourtDialog({ open, onOpenChange, eventId, courts, target, onChanged }: ChangeCourtDialogProps) {
  if (!target) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Cambiar pista">
      {/* Mounted only while the dialog is open: its state starts fresh every time */}
      <ChangeCourtForm
        eventId={eventId}
        courts={courts}
        target={target}
        onDone={() => {
          onOpenChange(false)
          onChanged()
        }}
      />
    </Dialog>
  )
}

function ChangeCourtForm({ eventId, courts, target, onDone }: {
  eventId: string
  courts: { id: string; name: string }[]
  target: ChangeCourtTarget
  onDone: () => void
}) {
  const [courtId, setCourtId] = useState(target.courtId ?? '')
  const [allRounds, setAllRounds] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const canApplyToAll = target.courtNumber !== null
  const unchanged = courtId === '' || courtId === target.courtId

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (unchanged) return
    setIsLoading(true)
    const scope = allRounds && target.courtNumber !== null ? { courtNumber: target.courtNumber } : { matchId: target.matchId }
    const result = await changeCourt(eventId, courtId, scope)
    setIsLoading(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success('Pista cambiada: avisamos a los jugadores')
    onDone()
  }

  return (
    <Form onSubmit={submit}>
      <Field label={`Nueva pista para «${target.title}»`} htmlFor="change-court">
        <Select id="change-court" value={courtId} onChange={e => setCourtId(e.target.value)}>
          <option value="">Elige una pista…</option>
          {courts.map(court => (
            <option key={court.id} value={court.id}>{court.name}{court.id === target.courtId ? ' (actual)' : ''}</option>
          ))}
        </Select>
      </Field>

      {canApplyToAll && (
        <Check>
          <input type="checkbox" checked={allRounds} onChange={e => setAllRounds(e.target.checked)} />
          Aplicar también a las demás rondas de esta pista
        </Check>
      )}

      <Note>Los jugadores de esos partidos reciben un aviso. Los partidos ya confirmados no cambian.</Note>

      <Button type="submit" $size="lg" disabled={isLoading || unchanged}>
        {isLoading ? 'Guardando…' : 'Cambiar pista'}
      </Button>
    </Form>
  )
}

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(4)};
`

const Check = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
  color: ${({ theme }) => theme.colors.ink};
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 600;

  input {
    width: 1.125rem;
    height: 1.125rem;
    accent-color: ${({ theme }) => theme.colors.forest};
  }
`

const Note = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSizes.md};
`
