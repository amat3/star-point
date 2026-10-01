'use client'

import styled from '@emotion/styled'
import { HAND_LABEL, type Hand } from '../atoms/HandTag'

export type HandCounts = Record<Hand, number>

// How many players of each side are signed up: the pairing is harder when,
// say, there are 9 drives and 3 revés.
function HandSummary({ counts }: { counts: HandCounts }) {
  return (
    <Root aria-label="Jugadores por posición">
      {(Object.keys(HAND_LABEL) as Hand[]).map(hand => (
        <Chip key={hand}>
          <strong>{counts[hand]}</strong> {HAND_LABEL[hand]}
        </Chip>
      ))}
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
`

const Chip = styled.span`
  padding: 0.125rem 0.5rem;
  border: 1px solid ${({ theme }) => theme.colors.line};
  border-radius: ${({ theme }) => theme.radii.pill};
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.6875rem;

  strong {
    color: ${({ theme }) => theme.colors.forest};
  }
`

export default HandSummary
