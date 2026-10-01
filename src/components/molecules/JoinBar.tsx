'use client'

import styled from '@emotion/styled'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import Button, { type ButtonVariant } from '../atoms/Button'

interface JoinBarProps {
  label: string
  variant?: ButtonVariant
  disabled?: boolean
  onClick?: () => void
  // Small text under the button; with `shield` it gets the guarantee icon
  note?: string
  shield?: string
}

// Fixed above the TabBar so the main action is always reachable.
function JoinBar({ label, variant = 'accent', disabled, onClick, note, shield }: JoinBarProps) {
  return (
    <Root>
      {shield && (
        <Shield>
          <ShieldCheck />
          {shield}
        </Shield>
      )}
      <Button $variant={variant} $size="lg" disabled={disabled} onClick={onClick}>
        {label}
        {variant === 'accent' && <ArrowRight />}
      </Button>
      {note && <Note>{note}</Note>}
    </Root>
  )
}

const Root = styled.div`
  position: fixed;
  bottom: calc(${({ theme }) => theme.layout.tabBarHeight} + env(safe-area-inset-bottom));
  left: 50%;
  z-index: 1;
  display: flex;
  width: 100%;
  max-width: ${({ theme }) => theme.layout.maxWidth};
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.5rem 1.5rem 0.75rem;
  background: linear-gradient(to bottom, transparent, ${({ theme }) => theme.colors.background} 1.25rem);
  transform: translateX(-50%);
`

const Shield = styled.p`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.6875rem;
  line-height: 1.35;

  svg {
    flex-shrink: 0;
    width: 0.875rem;
    height: 0.875rem;
    color: ${({ theme }) => theme.colors.forest};
  }
`

const Note = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.6875rem;
  text-align: center;
`

export default JoinBar
