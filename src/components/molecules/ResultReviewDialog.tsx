'use client'

import { useState } from 'react'
import styled from '@emotion/styled'
import { Check, CircleHelp, Flag } from 'lucide-react'
import Button from '../atoms/Button'
import Dialog from './Dialog'

interface ResultReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  myTeam: string[]
  opponents: string[]
  games: { mine: number; theirs: number }
  confirming?: boolean
  onConfirm: () => void
  // Opens the score editor so the viewer can fix the result
  onCorrect: () => void
}

// Review step before confirming: confirming updates everyone's rating and cannot be undone.
function ResultReviewDialog({ open, onOpenChange, myTeam, opponents, games, confirming, onConfirm, onCorrect }: ResultReviewDialogProps) {
  const [helpOpen, setHelpOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Confirma el resultado">
      <Summary>
        <Side>
          <Names>{myTeam.join(' + ')}</Names>
          <Big>{games.mine}</Big>
        </Side>
        <Versus>vs</Versus>
        <Side>
          <Names>{opponents.join(' + ')}</Names>
          <Big>{games.theirs}</Big>
        </Side>
      </Summary>

      <Actions>
        <Button type="button" $variant="primary" $size="lg" disabled={confirming} onClick={onConfirm}>
          <Check />
          {confirming ? 'Confirmando…' : 'Confirmar resultado'}
        </Button>
        <Button type="button" $variant="warn" $size="lg" disabled={confirming} onClick={onCorrect}>
          <Flag />
          Hay un error en el marcador
        </Button>
      </Actions>

      <HelpToggle type="button" aria-expanded={helpOpen} onClick={() => setHelpOpen(v => !v)}>
        <CircleHelp />
        ¿Qué pasa si no estamos de acuerdo?
      </HelpToggle>
      {helpOpen && (
        <Help>
          Corrige el marcador con los juegos que de verdad se jugaron: el rival lo recibirá para confirmarlo. Si en 24 horas
          nadie responde, se da por bueno el último marcador introducido.
        </Help>
      )}

      <Tagline>El buen juego también se juega fuera de la pista</Tagline>
    </Dialog>
  )
}

const Summary = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: end;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid ${({ theme }) => theme.colors.line};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
`

const Side = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  text-align: center;
`

const Names = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.75rem;
`

const Big = styled.span`
  color: ${({ theme }) => theme.colors.forest};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1;
`

const Versus = styled.span`
  align-self: center;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const HelpToggle = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.muted};
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;

  svg {
    width: 1rem;
    height: 1rem;
  }
`

const Help = styled.p`
  margin: -0.25rem 0 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.8125rem;
  line-height: 1.45;
  text-align: center;
`

const Tagline = styled.p`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.6875rem;

  &::before,
  &::after {
    flex: 1;
    height: 1px;
    background: ${({ theme }) => theme.colors.line};
    content: '';
  }
`

export default ResultReviewDialog
