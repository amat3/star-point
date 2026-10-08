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
          <Big>{games.mine}</Big>
          <Names>{myTeam.join(' + ')}</Names>
        </Side>
        <Versus>vs</Versus>
        <Side>
          <Big>{games.theirs}</Big>
          <Names>{opponents.join(' + ')}</Names>
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

// The score is the point of this step: a forest panel with big lime numbers, like the pending-action card
const Summary = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(6, 4)};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.hero};
  color: ${({ theme }) => theme.colors.onForest};
`

const Side = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
  text-align: center;
`

const Names = styled.span`
  opacity: 0.85;
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 600;
  line-height: 1.3;
  /* full names can be long: they wrap instead of overflowing the sheet */
  overflow-wrap: anywhere;
`

const Big = styled.span`
  color: ${({ theme }) => theme.colors.lime};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes.display};
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1;
`

const Versus = styled.span`
  align-self: center;
  opacity: 0.6;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
`

const HelpToggle = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing(2)};
  padding: 0;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.muted};
  font-family: inherit;
  font-size: ${({ theme }) => theme.fontSizes.md};
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
  font-size: ${({ theme }) => theme.fontSizes.md};
  line-height: 1.45;
  text-align: center;
`

const Tagline = styled.p`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSizes.xs};

  &::before,
  &::after {
    flex: 1;
    height: 1px;
    background: ${({ theme }) => theme.colors.line};
    content: '';
  }
`

export default ResultReviewDialog
