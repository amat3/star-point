'use client'

import { useEffect, useState } from 'react'
import styled from '@emotion/styled'
import { toast } from 'sonner'
import Button from '@/components/atoms/Button'
import Dialog from '@/components/molecules/Dialog'
import Stepper from '@/components/molecules/Stepper'
import { updateMatchScore } from '@/app/actions/matches'
import { toTitleCase } from '@/lib/utils'
import type { Match } from '@/types'

interface EditMatchDialogProps {
  match: Match
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MAX_GAMES = 50

const parseScore = (score: string) => {
  const [a, b] = (score || '0-0').split('-').map(Number)
  return { a: a || 0, b: b || 0 }
}

const pairLabel = (first?: { full_name?: string | null } | null, second?: { full_name?: string | null } | null) =>
  [first, second].map(p => toTitleCase(p?.full_name).split(' ')[0] || 'Jugador').join(' + ')

// Total games of each pair (no sets): the only thing that is recorded.
export function EditMatchDialog({ match, open, onOpenChange }: EditMatchDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [score, setScore] = useState(() => parseScore(match.score_details))

  // Start from the current score every time the dialog opens
  useEffect(() => {
    if (open) setScore(parseScore(match.score_details))
  }, [match, open])

  const isEmpty = score.a === 0 && score.b === 0

  async function handleSave() {
    if (isEmpty) return
    setIsSubmitting(true)
    try {
      await updateMatchScore(match.id, { score_details: `${score.a}-${score.b}` })
      toast.success('Resultado guardado')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar el resultado')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Resultado del partido"
      description="Indica los juegos totales de cada pareja."
      footer={
        <Button type="button" $size="lg" disabled={isSubmitting || isEmpty} onClick={handleSave}>
          {isSubmitting ? 'Guardando…' : 'Guardar resultado'}
        </Button>
      }
    >
      <Scores>
        <Stepper
          label={pairLabel(match.p_a1, match.p_a2)}
          value={score.a}
          max={MAX_GAMES}
          onChange={a => setScore(s => ({ ...s, a }))}
        />
        <Stepper
          label={pairLabel(match.p_b1, match.p_b2)}
          value={score.b}
          max={MAX_GAMES}
          onChange={b => setScore(s => ({ ...s, b }))}
        />
      </Scores>
      {isEmpty && <Hint>El marcador no puede ser 0-0.</Hint>}
    </Dialog>
  )
}

const Scores = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  padding: 0.5rem 0;
`

const Hint = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.75rem;
  text-align: center;
`
