'use client'

import styled from '@emotion/styled'
import { useTheme } from '@emotion/react'
import Link from 'next/link'
import { ArrowRight, Clock, Lock, MapPin } from 'lucide-react'
import PulsatingDot from '../atoms/PulsatingDot'

interface EventListItemProps {
  href: string
  day: string
  month: string
  title: string
  time: string
  venue?: string | null
  availability: string
  full?: boolean
  // Visitors without a session can see the event but not open it
  locked?: boolean
  // The viewer is signed up (as a starter or on the waiting list): highlighted
  joined?: boolean
}

function EventListItem({ href, day, month, title, time, venue, availability, full, locked, joined }: EventListItemProps) {
  const theme = useTheme()

  return (
    <Root href={href}>
      <DateBlock>
        <Day>{day}</Day>
        <Month>{month}</Month>
      </DateBlock>

      <Info>
        <Title>{title}</Title>
        <Meta>
          <MetaItem>
            <Clock />
            {time}
          </MetaItem>
          {venue && (
            <MetaItem>
              <MapPin />
              {venue}
            </MetaItem>
          )}
        </Meta>
        <StatusRow>
          <Availability $full={full}>
            {/* Green and alive while there is room; plain coral when it is full */}
            <PulsatingDot size={7} color={full ? theme.colors.coral : theme.colors.online} pulse={!full} />
            {availability}
          </Availability>
          {joined && <JoinedPill>Apuntado</JoinedPill>}
        </StatusRow>
      </Info>

      {locked ? <Lock /> : <ArrowRight />}
    </Root>
  )
}

const Root = styled(Link)`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid ${({ theme }) => theme.colors.hairline};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.card};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.ink};
  text-decoration: none;
  transition: transform 100ms ease;

  &:active {
    transform: scale(0.99);
  }

  > svg {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
  }
`

const DateBlock = styled.div`
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  width: 3.5rem;
  padding-right: .75rem;
  border-right: 1px solid ${({ theme }) => theme.colors.hairline};
`

const Day = styled.span`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1;
`

const Month = styled.span`
  margin-top: 0.25rem;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
`

const Info = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 0.25rem;
`

// Availability on the left, the "Apuntado" pill on the right: same spot on every card
const StatusRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`

// Marks the events the viewer is signed up for
const JoinedPill = styled.span`
  flex-shrink: 0;
  padding: 0.125rem 0.5rem;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.lime};
  color: ${({ theme }) => theme.colors.forestDeep};
  font-size: 0.625rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

const Title = styled.h3`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.ink};
`

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  color:#68766e;
`

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;

  svg {
    width: 0.875rem;
    height: 0.875rem;
  }
`

const Availability = styled('span', {
  shouldForwardProp: (prop) => prop !== '$full',
})<{ $full?: boolean }>`
  display: inline-flex;
  align-items: center;
  /* wider than the dot's ring so the pulse never touches the text */
  gap: 0.625rem;
  color: ${({ theme, $full }) => ($full ? theme.colors.coral : theme.colors.forest)};
  font-size: 0.75rem;
  font-weight: 600;
`

export default EventListItem
