'use client'

import styled from '@emotion/styled'
import PulsatingDot from '../atoms/PulsatingDot'

interface EventIntroProps {
  eyebrow: string
  title: string
  subtitle: string
  badge?: string
}

function EventIntro({ eyebrow, title, subtitle, badge }: EventIntroProps) {
  return (
    <Root>
      <Eyebrow>
        <PulsatingDot size={7} />
        {eyebrow}
      </Eyebrow>
      <Title>{title}</Title>
      <Subtitle>{subtitle}</Subtitle>
      {badge && <Badge>{badge}</Badge>}
    </Root>
  )
}

const Root = styled.section`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.25rem 1.5rem 0;
`

const Eyebrow = styled.p`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  color: ${({ theme }) => theme.colors.ink};
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`

const Title = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.forest};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
`

const Subtitle = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.875rem;
`

const Badge = styled.span`
  align-self: flex-start;
  padding: 0.125rem 0.5rem;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.coralTint};
  color: ${({ theme }) => theme.colors.coral};
  font-size: 0.6875rem;
  font-weight: 700;
`

export default EventIntro
