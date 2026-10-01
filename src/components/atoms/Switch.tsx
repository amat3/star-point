'use client'

import styled from '@emotion/styled'
import * as SwitchPrimitive from '@radix-ui/react-switch'

const Root = styled(SwitchPrimitive.Root)`
  position: relative;
  flex-shrink: 0;
  width: 2.75rem;
  height: 1.625rem;
  padding: 0;
  border: 0;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.fieldBorder};
  cursor: pointer;
  transition: background 150ms ease;

  &[data-state='checked'] {
    background: ${({ theme }) => theme.colors.forest};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.forest};
    outline-offset: 2px;
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`

const Thumb = styled(SwitchPrimitive.Thumb)`
  display: block;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background: #fff;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  transform: translateX(0.1875rem);
  transition: transform 150ms ease;

  &[data-state='checked'] {
    transform: translateX(1.3125rem);
  }
`

type SwitchProps = Omit<React.ComponentProps<typeof SwitchPrimitive.Root>, 'children'>

function Switch(props: SwitchProps) {
  return (
    <Root {...props}>
      <Thumb />
    </Root>
  )
}

export default Switch
