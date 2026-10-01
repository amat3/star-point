'use client'

import styled from '@emotion/styled'
import Link from 'next/link'
import { ArrowRight, Clock, Lock, MapPin } from 'lucide-react'

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
}

function EventListItem({ href, day, month, title, time, venue, availability, full, locked }: EventListItemProps) {
  return (
    <Root href={href}>
      <DateBlock>
        <Day>{day}</Day>
        <Month>{month}</Month>
      </DateBlock>

      <Info>
        <Title>{title}</Title>
        <Meta>
          <Clock />
          {time}
          <MapPin />
          {venue ?? 'Club por confirmar'}
        </Meta>
        <Availability $full={full}>{availability}</Availability>
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
  border: 1px solid ${({ theme }) => theme.colors.line};
  border-radius: ${({ theme }) => theme.radii.lg};
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
  text-transform: capitalize;
`

const Info = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 0.25rem;
`

const Title = styled.h3`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.0625rem;
  font-weight: 700;
  letter-spacing: -0.01em;
`

const Meta = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.375rem;
  font-size: 0.8125rem;

  svg {
    width: 0.875rem;
    height: 0.875rem;
  }
  svg + svg,
  svg:not(:first-of-type) {
    margin-left: 0.5rem;
  }
`

const Availability = styled('span', {
  shouldForwardProp: (prop) => prop !== '$full',
})<{ $full?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  color: ${({ theme, $full }) => ($full ? theme.colors.coral : theme.colors.forest)};
  font-size: 0.75rem;
  font-weight: 600;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ theme, $full }) => ($full ? theme.colors.coral : theme.colors.online)};
  }
`

export default EventListItem
