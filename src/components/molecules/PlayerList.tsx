'use client'

import { useState } from 'react'
import styled from '@emotion/styled'
import { X } from 'lucide-react'
import Avatar from '../atoms/Avatar'

export interface PlayerListItem {
  userId: string
  name: string
  avatarUrl: string | null
  level: string
  isGuest: boolean
  // "Plaza confirmada" or "Reserva 1"
  status: string
}

interface PlayerListProps {
  title: string
  players: PlayerListItem[]
  // Rows shown before the "+N jugadores" toggle
  collapsedCount?: number
  onSelect?: (userId: string) => void
  onRemove?: (userId: string) => void
}

function PlayerList({ title, players, collapsedCount = 3, onSelect, onRemove }: PlayerListProps) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? players : players.slice(0, collapsedCount)
  const hidden = players.length - visible.length

  return (
    <section>
      <Title>{title}</Title>
      {players.length === 0 ? (
        <Empty>Todavía no se ha apuntado nadie. ¡Sé el primero!</Empty>
      ) : (
        <Card>
          {visible.map(player => (
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
                <Level>Niv. {player.level}</Level>
              </Main>
              {onRemove && (
                <Remove type="button" aria-label={`Eliminar a ${player.name}`} onClick={() => onRemove(player.userId)}>
                  <X />
                </Remove>
              )}
            </Row>
          ))}
          {(hidden > 0 || expanded) && players.length > collapsedCount && (
            <Toggle type="button" onClick={() => setExpanded(e => !e)}>
              {expanded ? 'Ver menos' : `+ ${hidden} ${hidden === 1 ? 'jugador más' : 'jugadores más'}`}
            </Toggle>
          )}
        </Card>
      )}
    </section>
  )
}

const Title = styled.h2`
  margin: 0 0 0.75rem;
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
`

const Row = styled.div`
  display: flex;
  align-items: center;
  border-bottom: 1px solid ${({ theme }) => theme.colors.line};
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

const Toggle = styled.button`
  width: 100%;
  padding: 0.75rem 1rem;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.muted};
  font-family: inherit;
  font-size: 0.75rem;
  text-align: left;
  cursor: pointer;
`

const Empty = styled.p`
  margin: 0;
  padding: 1.25rem 1rem;
  border: 1px dashed ${({ theme }) => theme.colors.line};
  border-radius: ${({ theme }) => theme.radii.lg};
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.875rem;
  text-align: center;
`

export default PlayerList
