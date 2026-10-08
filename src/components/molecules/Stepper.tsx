'use client'

import styled from '@emotion/styled'
import { Minus, Plus } from 'lucide-react'

interface StepperProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}

// Big +/- counter, comfortable to use with a thumb (e.g. games in a score).
function Stepper({ label, value, onChange, min = 0, max = 99 }: StepperProps) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n))

  return (
    <Root role="group" aria-label={label}>
      <Caption>{label}</Caption>
      <Controls>
        <Step type="button" aria-label={`Restar a ${label}`} disabled={value <= min} onClick={() => onChange(clamp(value - 1))}>
          <Minus />
        </Step>
        <Value aria-live="polite">{value}</Value>
        <Step type="button" aria-label={`Sumar a ${label}`} disabled={value >= max} onClick={() => onChange(clamp(value + 1))}>
          <Plus />
        </Step>
      </Controls>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
`

const Caption = styled.span`
  max-width: 100%;
  overflow: hidden;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 700;
  letter-spacing: 0.04em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
`

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
`

const Step = styled.button`
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border: 1px solid ${({ theme }) => theme.colors.fieldBorder};
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.field};
  color: ${({ theme }) => theme.colors.forest};
  cursor: pointer;
  touch-action: manipulation;

  svg {
    width: 1.125rem;
    height: 1.125rem;
  }
  &:active:not(:disabled) {
    background: ${({ theme }) => theme.colors.surface};
  }
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`

const Value = styled.span`
  min-width: 3rem;
  color: ${({ theme }) => theme.colors.forest};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes['5xl']};
  font-weight: 700;
  line-height: 1;
  text-align: center;
`

export default Stepper
