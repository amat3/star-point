'use client'

import styled from '@emotion/styled'

interface RoundTabsProps {
  rounds: number[]
  active: number
  onChange: (round: number) => void
}

function RoundTabs({ rounds, active, onChange }: RoundTabsProps) {
  return (
    <Root role="tablist">
      {rounds.map(round => (
        <Tab
          key={round}
          role="tab"
          type="button"
          aria-selected={round === active}
          onClick={() => onChange(round)}
        >
          Ronda {round}
        </Tab>
      ))}
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  gap: 0.25rem;
  padding: 0.25rem;
  border: 1px solid ${({ theme }) => theme.colors.line};
  border-radius: ${({ theme }) => theme.radii.lg};
`

const Tab = styled.button`
  flex: 1;
  padding: 0.625rem 0.5rem;
  border: 0;
  border-radius: ${({ theme }) => theme.radii.md};
  background: transparent;
  color: ${({ theme }) => theme.colors.muted};
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease;

  &[aria-selected='true'] {
    background: ${({ theme }) => theme.colors.forest};
    color: ${({ theme }) => theme.colors.onForest};
  }
`

export default RoundTabs
