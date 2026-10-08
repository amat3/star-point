'use client'

import styled from '@emotion/styled'
import type { Theme } from '@/theme'
import Badge, { type BadgeVariant } from '../atoms/Badge'

export type MatchOutcome = 'win' | 'loss' | 'draw'

const OUTCOME: Record<MatchOutcome, { label: string; variant: BadgeVariant }> = {
  win: { label: 'Victoria', variant: 'accent' },
  loss: { label: 'Derrota', variant: 'danger' },
  draw: { label: 'Empate', variant: 'outline' },
}

interface MatchResultCardProps {
  // e.g. "14 oct 2026"
  date: string
  // Event title / club, shown under the date
  context?: string
  outcome: MatchOutcome
  myTeam: string[]
  opponents: string[]
  games: { mine: number; theirs: number }
}

// One finished match from the viewer's side: their pair on the left.
function MatchResultCard({ date, context, outcome, myTeam, opponents, games }: MatchResultCardProps) {
  const { label, variant } = OUTCOME[outcome]

  return (
    <Root $outcome={outcome}>
      <Top>
        <When>
          <DateLabel>{date}</DateLabel>
          {context && <Context>{context}</Context>}
        </When>
        <Badge $variant={variant}>{label}</Badge>
      </Top>

      <Teams>
        <Names>
          {myTeam.map(name => <span key={name}>{name}</span>)}
        </Names>
        <Score $outcome={outcome}>
          {games.mine}
          <Dash>-</Dash>
          {games.theirs}
        </Score>
        <Names $end>
          {opponents.map(name => <span key={name}>{name}</span>)}
        </Names>
      </Teams>
    </Root>
  )
}

// Outcome colors: a tinted card with a stronger stripe on the left.
const outcomeColors = (theme: Theme, outcome: MatchOutcome) => ({
  win: { stripe: theme.colors.online, tint: theme.colors.winTint, score: theme.colors.forest },
  loss: { stripe: theme.colors.danger, tint: theme.colors.coralTint, score: theme.colors.danger },
  draw: { stripe: theme.colors.fieldBorder, tint: 'transparent', score: theme.colors.ink },
})[outcome]

const Root = styled('article', {
  shouldForwardProp: (prop) => prop !== '$outcome',
})<{ $outcome: MatchOutcome }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(4)};
  padding: ${({ theme }) => theme.spacing(4, 4, 4, 4)};
  border: 1px solid ${({ theme }) => theme.colors.line};
  border-left: 5px solid ${({ theme, $outcome }) => outcomeColors(theme, $outcome).stripe};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.card};
  background: ${({ theme, $outcome }) => outcomeColors(theme, $outcome).tint};
`

const Top = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(3)};
`

const When = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(0.5)};
`

const DateLabel = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 700;
`

const Context = styled.span`
  overflow: hidden;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Teams = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
`

const Names = styled('div', {
  shouldForwardProp: (prop) => prop !== '$end',
})<{ $end?: boolean }>`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(0.5)};
  text-align: ${({ $end }) => ($end ? 'right' : 'left')};
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 600;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const Score = styled('div', {
  shouldForwardProp: (prop) => prop !== '$outcome',
})<{ $outcome: MatchOutcome }>`
  color: ${({ theme, $outcome }) => outcomeColors(theme, $outcome).score};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1;
  white-space: nowrap;
`

const Dash = styled.span`
  margin: ${({ theme }) => theme.spacing(0, 1)};
  color: ${({ theme }) => theme.colors.muted};
  font-weight: 500;
`

export default MatchResultCard
