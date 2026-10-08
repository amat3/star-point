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
  gap: ${({ theme }) => theme.spacing(1)};
  padding: ${({ theme }) => theme.spacing(1)};
  border: 1px solid ${({ theme }) => theme.colors.line};
  border-radius: ${({ theme }) => theme.radii.lg};
`

const Tab = styled.button`
  flex: 1;
  padding: ${({ theme }) => theme.spacing(3, 2)};
  border: 0;
  border-radius: ${({ theme }) => theme.radii.md};
  background: transparent;
  color: ${({ theme }) => theme.colors.muted};
  font-family: inherit;
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease;

  &[aria-selected='true'] {
    background: ${({ theme }) => theme.colors.forest};
    color: ${({ theme }) => theme.colors.onForest};
  }
`

export default RoundTabs
