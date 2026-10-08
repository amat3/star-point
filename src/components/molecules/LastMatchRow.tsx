'use client'

import styled from '@emotion/styled'
import { CalendarDays } from 'lucide-react'
import type { Theme } from '@/theme'

interface LastMatchRowProps {
  title: string
  meta: string
  score: string
  outcome: 'win' | 'loss' | 'draw'
}

function LastMatchRow({ title, meta, score, outcome }: LastMatchRowProps) {
  return (
    <Root>
      <IconBox $outcome={outcome}>
        <CalendarDays />
      </IconBox>
      <Info>
        <Title>{title}</Title>
        <Meta>{meta}</Meta>
      </Info>
      <Score $outcome={outcome}>{score}</Score>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(4)};
`

// Same code as the history cards: green win, red loss, neutral draw.
const outcomeColors = (theme: Theme, outcome: LastMatchRowProps['outcome']) => ({
  win: { tint: theme.colors.winTint, icon: theme.colors.online, score: theme.colors.forest },
  loss: { tint: theme.colors.coralTint, icon: theme.colors.danger, score: theme.colors.danger },
  draw: { tint: theme.colors.surface, icon: theme.colors.muted, score: theme.colors.ink },
})[outcome]

const IconBox = styled('div', {
  shouldForwardProp: (prop) => prop !== '$outcome',
})<{ $outcome: LastMatchRowProps['outcome'] }>`
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1.5px solid ${({ theme, $outcome }) => outcomeColors(theme, $outcome).icon};
  background: ${({ theme, $outcome }) => outcomeColors(theme, $outcome).tint};
  color: ${({ theme, $outcome }) => outcomeColors(theme, $outcome).icon};

  svg {
    width: 1rem;
    height: 1rem;
  }
`

const Info = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(0.5)};
`

const Title = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.ink};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
`

const Meta = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSizes['2xs']};
`

const Score = styled('span', {
  shouldForwardProp: (prop) => prop !== '$outcome',
})<{ $outcome: LastMatchRowProps['outcome'] }>`
  flex-shrink: 0;
  color: ${({ theme, $outcome }) => outcomeColors(theme, $outcome).score};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 700;
`

export default LastMatchRow
