'use client'

import styled from '@emotion/styled'
import { CalendarDays } from 'lucide-react'

interface LastMatchRowProps {
  title: string
  meta: string
  score: string
}

function LastMatchRow({ title, meta, score }: LastMatchRowProps) {
  return (
    <Root>
      <IconBox>
        <CalendarDays />
      </IconBox>
      <Info>
        <Title>{title}</Title>
        <Meta>{meta}</Meta>
      </Info>
      <Score>{score}</Score>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  align-items: center;
  gap: 0.875rem;
`

const IconBox = styled.div`
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.coralTint};
  color: ${({ theme }) => theme.colors.coral};

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
  gap: 0.125rem;
`

const Title = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.ink};
  font-size: 0.6875rem;
  font-weight: 600;
`

const Meta = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.625rem;
`

const Score = styled.span`
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.forest};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1rem;
  font-weight: 700;
`

export default LastMatchRow
