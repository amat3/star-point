'use client'

import styled from '@emotion/styled'
import { X } from 'lucide-react'
import Avatar from '../atoms/Avatar'
import HandTag, { type Hand } from '../atoms/HandTag'

export interface PlayerListItem {
  userId: string
  name: string
  avatarUrl: string | null
  hand: Hand | null
  // Only sent to admins
  level?: string
  isGuest: boolean
  // "Plaza confirmada" or "Reserva 1"
  status: string
}

interface PlayerListProps {
  title: string
  // Shown next to the title (e.g. the count of players per side)
  headerExtra?: React.ReactNode
  players: PlayerListItem[]
  // Number of confirmed spots: empty ones are shown as "Plaza libre" rows
  totalSlots: number
  onSelect?: (userId: string) => void
  onRemove?: (userId: string) => void
}

function PlayerList({ title, headerExtra, players, totalSlots, onSelect, onRemove }: PlayerListProps) {
  // Confirmed spots first (filled or free), then the reserves in sign-up order.
  const rows = Math.max(totalSlots, players.length)

  return (
    <section>
      <Header>
        <Title>{title}</Title>
        {headerExtra}
      </Header>
      <Card>
        {Array.from({ length: rows }, (_, index) => {
          const player = players[index]
          if (!player) {
            return (
              <Row key={`free-${index}`}>
                <Free>
                  <Placeholder aria-hidden="true">?</Placeholder>
                  <FreeLabel>Plaza libre</FreeLabel>
                </Free>
              </Row>
            )
          }
          return (
            <Row key={player.userId}>
              <Main type="button" onClick={() => onSelect?.(player.userId)} disabled={!onSelect}>
                <Avatar src={player.avatarUrl} name={player.name} size={40} />
                <Info>
                  <Name>
                    {player.name}
                    {player.isGuest && <Guest>Inv.</Guest>}
                  </Name>
                  <Status>{player.status}</Status>
                </Info>
                <Tags>
                  <HandTag hand={player.hand} />
                  {player.level && <Level>Niv. {player.level}</Level>}
                </Tags>
              </Main>
              {onRemove && (
                <Remove type="button" aria-label={`Eliminar a ${player.name}`} onClick={() => onRemove(player.userId)}>
                  <X />
                </Remove>
              )}
            </Row>
          )
        })}
      </Card>
    </section>
  )
}

const Header = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
`

const Tags = styled.div`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.375rem;
`

const Title = styled.h2`
  margin: 0;
  padding: 0;
  border: 0;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.125rem;
  font-weight: 600;
`

const Card = styled.div`
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.line};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.card};
`

const Row = styled.div`
  display: flex;
  align-items: center;
  border-bottom: 1px solid ${({ theme }) => theme.colors.line};

  &:last-child {
    border-bottom: 0;
  }
`

const Main = styled.button`
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: 0;
  background: transparent;
  color: inherit;
  font-family: inherit;
  text-align: left;
  cursor: pointer;

  &:disabled {
    cursor: default;
  }
`

const Info = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 0.125rem;
`

const Name = styled.span`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  overflow: hidden;
  font-size: 0.9375rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Guest = styled.span`
  flex-shrink: 0;
  padding: 0 0.25rem;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.coralTint};
  color: ${({ theme }) => theme.colors.coral};
  font-size: 0.625rem;
  font-weight: 700;
`

const Status = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.75rem;
`

const Level = styled.span`
  flex-shrink: 0;
  padding: 0.25rem 0.625rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.forest};
  font-size: 0.75rem;
  font-weight: 700;
`

const Remove = styled.button`
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  margin-right: 0.5rem;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.muted};
  cursor: pointer;

  svg {
    width: 1rem;
    height: 1rem;
  }
`

const Free = styled.div`
  display: flex;
  flex: 1;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
`

const Placeholder = styled.span`
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1.5px dashed ${({ theme }) => theme.colors.fieldBorder};
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.forest};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1;
`

const FreeLabel = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.875rem;
`

export default PlayerList
