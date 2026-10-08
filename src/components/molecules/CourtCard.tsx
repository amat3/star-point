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
  // Small control at the right of the title (admin: change the court)
  headerAction?: React.ReactNode
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

function CourtCard({ title, mine, teamA, teamB, footer, headerAction }: CourtCardProps) {
  return (
    <Root $mine={mine}>
      <Header>
        <Title>{title}</Title>
        {mine && <MineTag>Tu partido</MineTag>}
        {headerAction && <HeaderAction>{headerAction}</HeaderAction>}
      </Header>
      <Teams>
        <Team players={teamA} />
        <Divider>
          <Versus>vs</Versus>
        </Divider>
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
  gap: ${({ theme }) => theme.spacing(4)};
  padding: ${({ theme }) => theme.spacing(4)};
  border: 1px solid ${({ theme, $mine }) => ($mine ? theme.colors.forest : theme.colors.line)};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.card};
  background: ${({ theme, $mine }) => ($mine ? theme.colors.surface : 'transparent')};
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
`

const HeaderAction = styled.div`
  margin-left: auto;
`

const Title = styled.h3`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 700;
`

const MineTag = styled.span`
  padding: ${({ theme }) => theme.spacing(0.5, 2)};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.lime};
  color: ${({ theme }) => theme.colors.forestDeep};
  font-size: ${({ theme }) => theme.fontSizes['2xs']};
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

const Teams = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: stretch;
  gap: ${({ theme }) => theme.spacing(2)};
`

const TeamColumn = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing(3)};
`

const Player = styled.div`
  display: flex;
  min-width: 0;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
`

const Info = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};
`

const Name = styled.span`
  overflow: hidden;
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1)};
`

const Level = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
`

// Line + "vs" + line: a vertical wall between the two pairs, so it is clear who plays together
const Divider = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};

  &::before,
  &::after {
    content: '';
    flex: 1;
    min-height: 0.5rem;
    width: 2px;
    border-radius: 1px;
    background: ${({ theme }) => theme.colors.fieldBorder};
  }
`

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
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
`

const Footer = styled.div`
  padding-top: ${({ theme }) => theme.spacing(3)};
  border-top: 1px solid ${({ theme }) => theme.colors.line};
`

export default CourtCard
