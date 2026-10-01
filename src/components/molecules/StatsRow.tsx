'use client'

import styled from '@emotion/styled'
import { Swords, Trophy } from 'lucide-react'

interface StatsRowProps {
  matchesPlayed: number
  matchesWon: number
  // 0..1
  winRatio: number
}

function StatsRow({ matchesPlayed, matchesWon, winRatio }: StatsRowProps) {
  return (
    <Root>
      <Tile>
        <Caption>
          <Swords />
          Partidos jugados
        </Caption>
        <Value>{matchesPlayed}</Value>
        <Detail>en total</Detail>
      </Tile>

      <Tile>
        <Caption>
          <Trophy />
          Ratio de victorias
        </Caption>
        <Value>
          {Math.round(winRatio * 100)}
          <Unit>%</Unit>
        </Value>
        <Detail>
          {matchesWon} {matchesWon === 1 ? 'victoria' : 'victorias'}
        </Detail>
      </Tile>
    </Root>
  )
}

const Root = styled.section`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
`

const Tile = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid ${({ theme }) => theme.colors.line};
  border-radius: ${({ theme }) => theme.radii.lg};
`

const Caption = styled.span`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.625rem;
  font-weight: 600;

  svg {
    flex-shrink: 0;
    width: 0.8125rem;
    height: 0.8125rem;
  }
`

const Value = styled.span`
  align-self: center;
  color: ${({ theme }) => theme.colors.forest};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 2.25rem;
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1;
`

const Unit = styled.span`
  margin-left: 0.125rem;
  font-size: 1.25rem;
  letter-spacing: 0;
`

const Detail = styled.span`
  align-self: center;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.625rem;
`

export default StatsRow
