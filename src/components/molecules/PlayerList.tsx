'use client'

import styled from '@emotion/styled'
import { Pencil, Users, X } from 'lucide-react'
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
  // Mixing waiting list: once the starters are full, a "Lista de espera" section lists the
  // reserves and the first free reserve spot (up to `capacity` reserves)
  waitlist?: { capacity: number }
  onSelect?: (userId: string) => void
  onRemove?: (userId: string) => void
  // Which rows get the remove button (all of them by default)
  canRemove?: (player: PlayerListItem) => boolean
  // Rename button on the rows `canEdit` allows
  onEdit?: (userId: string) => void
  canEdit?: (player: PlayerListItem) => boolean
  // Show the "Inv." tag on guests (default); partidos do not care about it
  showGuestTag?: boolean
}

function PlayerList({ title, headerExtra, players, totalSlots, waitlist, onSelect, onRemove, canRemove, onEdit, canEdit, showGuestTag = true }: PlayerListProps) {
  const reserves = players.slice(totalSlots)
  // The waiting list only exists once every starter spot is taken
  const showWaitlist = !!waitlist && players.length >= totalSlots

  const renderPlayer = (player: PlayerListItem) => (
    <Row key={player.userId}>
      <Main type="button" onClick={() => onSelect?.(player.userId)} disabled={!onSelect}>
        <Avatar src={player.avatarUrl} name={player.name} size={40} />
        <Info>
          <Name>
            {player.name}
            {player.isGuest && showGuestTag && <Guest>Inv.</Guest>}
          </Name>
          <Status>{player.status}</Status>
        </Info>
        <Tags>
          <HandTag hand={player.hand} />
          {player.level && <Level>Niv. {player.level}</Level>}
        </Tags>
      </Main>
      {onEdit && (canEdit?.(player) ?? true) && (
        <Edit type="button" aria-label={`Cambiar el nombre de ${player.name}`} onClick={() => onEdit(player.userId)}>
          <Pencil />
        </Edit>
      )}
      {onRemove && (canRemove?.(player) ?? true) && (
        <Remove type="button" aria-label={`Eliminar a ${player.name}`} onClick={() => onRemove(player.userId)}>
          <X />
        </Remove>
      )}
    </Row>
  )

  const renderFree = (key: string, label: string) => (
    <Row key={key}>
      <Free>
        <Placeholder aria-hidden="true">?</Placeholder>
        <FreeLabel>{label}</FreeLabel>
      </Free>
    </Row>
  )

  return (
    <section>
      <Header>
        <Title>{title}</Title>
        {headerExtra}
      </Header>
      <Card>
        {Array.from({ length: totalSlots }, (_, index) =>
          players[index] ? renderPlayer(players[index]) : renderFree(`free-${index}`, 'Plaza libre')
        )}
        {/* Without a waiting list (partidos) anything beyond the spots just continues the list */}
        {!showWaitlist && reserves.map(renderPlayer)}
      </Card>

      {showWaitlist && (
        <Waitlist aria-label="Lista de espera">
          <WaitHeader>
            <WaitIcon>
              <Users />
            </WaitIcon>
            <WaitText>
              <WaitTitle>Lista de espera</WaitTitle>
              <WaitDetail>Entran si se libera una plaza</WaitDetail>
            </WaitText>
            <WaitCount>{reserves.length} en reserva</WaitCount>
          </WaitHeader>
          {reserves.map(renderPlayer)}
          {reserves.length < waitlist.capacity &&
            renderFree('free-reserve', `Reserva ${reserves.length + 1} · libre`)}
        </Waitlist>
      )}
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

// The waiting list is its own list, tinted like the "no confirmed yet" state it represents
const Waitlist = styled.div`
  margin-top: 0.75rem;
  overflow: hidden;
  border: 1px dashed ${({ theme }) => theme.colors.coral};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.coralTint};

  > div {
    border-bottom-color: color-mix(in srgb, ${({ theme }) => theme.colors.coral} 30%, transparent);
  }

  /* the "?" placeholder takes the same tone */
  span[aria-hidden='true'] {
    border-color: ${({ theme }) => theme.colors.coral};
    background: transparent;
    color: ${({ theme }) => theme.colors.coral};
  }
`

const WaitHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid transparent;
`

const WaitIcon = styled.span`
  display: grid;
  flex-shrink: 0;
  place-items: center;
  color: ${({ theme }) => theme.colors.coral};

  svg {
    width: 1.25rem;
    height: 1.25rem;
  }
`

const WaitText = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 0.125rem;
`

const WaitTitle = styled.span`
  color: ${({ theme }) => theme.colors.coral};
  font-size: 0.8125rem;
  font-weight: 700;
`

const WaitDetail = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.75rem;
`

const WaitCount = styled.span`
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.coral};
  font-size: 0.8125rem;
  font-weight: 700;
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

const Edit = styled.button`
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.muted};
  cursor: pointer;

  svg {
    width: 1rem;
    height: 1rem;
  }
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
