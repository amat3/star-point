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
  // Club name, shown next to the time
  venue?: string | null
  action?: { label: string; href: string }
}

function EventHeroCard({ title, startsAt, statusLabel, durationMinutes, courts, players, venue, action }: EventHeroCardProps) {
  // The title is always "weekday, date": the weekday goes on the first line, the date on the second
  const [weekday, ...rest] = title.split(', ')
  const date = rest.length > 0 ? rest.join(', ') : weekday
  const hasWeekday = rest.length > 0

  return (
    <HeroCard>
      <Top>
        <IconBox>
          <CalendarDays />
        </IconBox>
        <Info>
          <Title>
            <TitleLine>{hasWeekday ? `${weekday},` : date}</TitleLine>
            {hasWeekday && <TitleLine>{date}</TitleLine>}
          </Title>
          <Subtitle>A partir de las {startsAt}{venue ? ` · ${venue}` : ''}</Subtitle>
        </Info>
        <Status $variant="accent">{statusLabel}</Status>
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
          {courts} {courts === 1 ? 'pista' : 'pistas'}
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
  /* on very narrow screens the status drops to its own line instead of overlapping the title */
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.75rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, .14);
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
  /* never narrower than ~8rem: below that the status wraps to the next line.
     The big grow factor makes the title take almost all the spare room on the row. */
  flex: 100 1 8rem;
  min-width: 0;
`

// Beside the title it stays about 6rem wide (two lines: "Inscripción / abierta"). When it
// does not fit and wraps to its own row, flex-grow stretches it across the whole card,
// so it works as a separator between the header and the stats.
const Status = styled(Badge)`
  flex: 1 0 6rem;
  padding: 0.375rem 0.625rem;
  line-height: 1.2;
  text-align: center;
  white-space: normal;
`

const Title = styled.h3`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
`

const TitleLine = styled.span`
  display: block;
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
  /* lets Stat react to the card's own width instead of the screen's */
  container: stats / inline-size;
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

  /* Narrow card (small phones): the icon goes above its text, three columns */
  @container stats (max-width: 17rem) {
    flex-direction: column;
    gap: 0.25rem;
    text-align: center;
  }
`

export default EventHeroCard
