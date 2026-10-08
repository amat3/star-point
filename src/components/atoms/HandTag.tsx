'use client'

import styled from '@emotion/styled'

export type Hand = 'reves' | 'drive' | 'ambos'

export const HAND_LABEL: Record<Hand, string> = {
  reves: 'Revés',
  drive: 'Drive',
  ambos: 'Ambos',
}

// Which side of the court a player prefers. Unknown values render nothing.
function HandTag({ hand }: { hand: Hand | null | undefined }) {
  if (!hand || !(hand in HAND_LABEL)) return null
  return <Tag>{HAND_LABEL[hand]}</Tag>
}

const Tag = styled.span`
  flex-shrink: 0;
  padding: ${({ theme }) => theme.spacing(0.5, 2)};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.forest};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
`

export default HandTag
