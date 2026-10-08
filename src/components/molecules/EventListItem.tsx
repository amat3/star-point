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
  // Draw published but the event has not started: nothing to do yet, a calm still dot
  created?: boolean
  // Event over but results still to be saved or confirmed: amber, still dot
  pending?: boolean
  // Visitors without a session can see the event but not open it
  locked?: boolean
  // The viewer is signed up (as a starter or on the waiting list): highlighted
  joined?: boolean
}

function EventListItem({ href, day, month, title, time, venue, availability, full, created, pending, locked, joined }: EventListItemProps) {
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
          <Availability $full={full} $created={created} $pending={pending}>
            {/* Green and alive while there is room or the event is on; coral and still when it is full; amber and still when results are pending; grey and still while the draw waits for its start */}
            <PulsatingDot
              size={7}
              color={full ? theme.colors.coral : pending ? theme.colors.amber : created ? theme.colors.muted : theme.colors.online}
              pulse={!full && !created && !pending}
            />
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
  gap: ${({ theme }) => theme.spacing(4)};
  padding: ${({ theme }) => theme.spacing(4)};
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
  padding-right: ${({ theme }) => theme.spacing(3)};
  border-right: 1px solid ${({ theme }) => theme.colors.hairline};
`

const Day = styled.span`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes['4xl']};
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1;
`

const Month = styled.span`
  margin-top: ${({ theme }) => theme.spacing(1)};
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
`

const Info = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};
`

// Availability on the left, the "Apuntado" pill on the right: same spot on every card
const StatusRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(2)};
`

// Marks the events the viewer is signed up for
const JoinedPill = styled.span`
  flex-shrink: 0;
  padding: ${({ theme }) => theme.spacing(0.5, 2)};
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.lime};
  color: ${({ theme }) => theme.colors.forestDeep};
  font-size: ${({ theme }) => theme.fontSizes['2xs']};
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

const Title = styled.h3`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.ink};
`

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing(2, 3)};
  font-size: ${({ theme }) => theme.fontSizes.md};
  color: ${({ theme }) => theme.colors.subtle};
`

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1)};

  svg {
    width: 0.875rem;
    height: 0.875rem;
  }
`

const Availability = styled('span', {
  shouldForwardProp: (prop) => prop !== '$full' && prop !== '$created' && prop !== '$pending',
})<{ $full?: boolean; $created?: boolean; $pending?: boolean }>`
  display: inline-flex;
  align-items: center;
  /* wider than the dot's ring so the pulse never touches the text */
  gap: ${({ theme }) => theme.spacing(2)};
  color: ${({ theme, $full, $created, $pending }) => ($full ? theme.colors.coral : $pending ? theme.colors.amber : $created ? theme.colors.subtle : theme.colors.forest)};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
`

export default EventListItem
