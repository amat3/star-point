'use client'

import styled from '@emotion/styled'
import Avatar from '../atoms/Avatar'
import HandTag, { type Hand } from '../atoms/HandTag'

export interface CourtPlayer {
  userId: string
  name: string
  avatarUrl: string | null
  hand: Hand | null
  // Only sent to admins
  level?: string
}

interface CourtCardProps {
  title: string
  // Highlights the card as the viewer's own match
  mine?: boolean
  teamA: CourtPlayer[]
  teamB: CourtPlayer[]
  footer?: React.ReactNode
}

function Team({ players }: { players: CourtPlayer[] }) {
  return (
    <TeamColumn>
      {players.map(player => (
        <Player key={player.userId}>
          <Avatar src={player.avatarUrl} name={player.name} size={36} />
          <Info>
            <Name>{player.name}</Name>
            <Meta>
              <HandTag hand={player.hand} />
              {player.level && <Level>Niv. {player.level}</Level>}
            </Meta>
          </Info>
        </Player>
      ))}
    </TeamColumn>
  )
}

function CourtCard({ title, mine, teamA, teamB, footer }: CourtCardProps) {
  return (
    <Root $mine={mine}>
      <Header>
        <Title>{title}</Title>
        {mine && <MineTag>Tu partido</MineTag>}
      </Header>
      <Teams>
        <Team players={teamA} />
        <Versus>vs</Versus>
        <Team players={teamB} />
      </Teams>
      {footer && <Footer>{footer}</Footer>}
    </Root>
  )
}

const Root = styled('article', {
  shouldForwardProp: (prop) => prop !== '$mine',
})<{ $mine?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  padding: 1rem;
  border: 1px solid ${({ theme, $mine }) => ($mine ? theme.colors.forest : theme.colors.line)};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.card};
  background: ${({ theme, $mine }) => ($mine ? theme.colors.surface : 'transparent')};
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const Title = styled.h3`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.9375rem;
  font-weight: 700;
`

const MineTag = styled.span`
  padding: 0.125rem 0.5rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.lime};
  color: ${({ theme }) => theme.colors.forestDeep};
  font-size: 0.625rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

const Teams = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.625rem;
`

const TeamColumn = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.75rem;
`

const Player = styled.div`
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.5rem;
`

const Info = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.25rem;
`

const Name = styled.span`
  overflow: hidden;
  font-size: 0.875rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
`

const Level = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.6875rem;
`

// A filled badge: the two pairs face each other, so "vs" must read as the dividing point
const Versus = styled.span`
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.forest};
  color: ${({ theme }) => theme.colors.onForest};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
`

const Footer = styled.div`
  padding-top: 0.75rem;
  border-top: 1px solid ${({ theme }) => theme.colors.line};
`

export default CourtCard
