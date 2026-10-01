'use client'

import styled from '@emotion/styled'
import { CalendarDays, Clock, MapPin, Users } from 'lucide-react'
import HeroCard from '../atoms/HeroCard'
import Badge from '../atoms/Badge'
import { ButtonLink } from '../atoms/Button'

interface EventHeroCardProps {
  title: string
  startsAt: string
  statusLabel: string
  durationMinutes: number
  courts: number
  players: string
  action?: { label: string; href: string }
}

function EventHeroCard({ title, startsAt, statusLabel, durationMinutes, courts, players, action }: EventHeroCardProps) {
  return (
    <HeroCard>
      <Top>
        <IconBox>
          <CalendarDays />
        </IconBox>
        <Info>
          <Title>{title}</Title>
          <Subtitle>A partir de las {startsAt}</Subtitle>
        </Info>
        <Badge $variant="accent">{statusLabel}</Badge>
      </Top>

      {action && (
        <ButtonLink href={action.href} $variant="accent">
          {action.label}
        </ButtonLink>
      )}

      <Stats>
        <Stat>
          <Clock />
          {durationMinutes} min
        </Stat>
        <Stat>
          <MapPin />
          {courts} pistas
        </Stat>
        <Stat>
          <Users />
          {players} jugadores
        </Stat>
      </Stats>
    </HeroCard>
  )
}

const Top = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
`

const IconBox = styled.div`
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.heroTint};
  color: ${({ theme }) => theme.colors.lime};

  svg {
    width: 1.375rem;
    height: 1.375rem;
  }
`

const Info = styled.div`
  flex: 1;
  min-width: 0;
`

const Title = styled.h3`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
`

const Subtitle = styled.p`
  margin: 0.25rem 0 0;
  color: ${({ theme }) => theme.colors.lime};
  opacity: 0.75;
  font-size: 0.875rem;
`

const Stats = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.5rem 1rem;
`

const Stat = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;

  svg {
    width: 1rem;
    height: 1rem;
    color: ${({ theme }) => theme.colors.lime};
  }
`

export default EventHeroCard
