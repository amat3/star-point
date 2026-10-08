'use client'

import { useMemo, useState } from 'react'
import styled from '@emotion/styled'
import Avatar from '../atoms/Avatar'
import HandTag, { type Hand } from '../atoms/HandTag'
import EmptyState from '../molecules/EmptyState'
import SegmentedControl from '../molecules/SegmentedControl'
import { PlayerProfileDialog } from '@/components/events/PlayerProfileDialog'
import { toTitleCase } from '@/lib/utils'

export interface AdminPlayer {
  id: string
  full_name: string | null
  avatar_url: string | null
  rating: number
  matches_played: number
  court_position: Hand | null
}

type SortBy = 'name' | 'rating'

function PlayersAdminList({ players }: { players: AdminPlayer[] }) {
  const [sortBy, setSortBy] = useState<SortBy>('name')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const sorted = useMemo(
    () =>
      [...players].sort((a, b) =>
        sortBy === 'rating'
          ? b.rating - a.rating || b.matches_played - a.matches_played
          : (a.full_name ?? '').localeCompare(b.full_name ?? '', 'es')
      ),
    [players, sortBy]
  )

  if (players.length === 0) return <EmptyState>Todavía no hay jugadores.</EmptyState>

  return (
    <>
      <PlayerProfileDialog
        userId={selectedId}
        userRole="admin"
        open={selectedId !== null}
        onOpenChange={(open) => { if (!open) setSelectedId(null) }}
      />

      <Toolbar>
        <Count>{players.length} jugadores</Count>
        <SegmentedControl
          label="Ordenar por"
          value={sortBy}
          onChange={setSortBy}
          options={[
            { value: 'name', label: 'Nombre' },
            { value: 'rating', label: 'Nivel' },
          ]}
        />
      </Toolbar>

      <List>
        {sorted.map((player, index) => {
          const name = toTitleCase(player.full_name) || '—'
          return (
            <Row key={player.id} type="button" onClick={() => setSelectedId(player.id)}>
              {sortBy === 'rating' && <Rank>{index + 1}</Rank>}
              <Avatar src={player.avatar_url} name={name} size={36} />
              <Info>
                <Name>{name}</Name>
                <Meta>
                  <HandTag hand={player.court_position} />
                  <span>{player.matches_played} partidos</span>
                </Meta>
              </Info>
              <Rating>{player.rating.toFixed(2)}</Rating>
            </Row>
          )
        })}
      </List>
    </>
  )
}

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(3)};
`

const Count = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 600;
`

const List = styled.div`
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.line};
  border-radius: ${({ theme }) => theme.radii.lg};
`

const Row = styled.button`
  display: flex;
  width: 100%;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(3, 4)};
  border: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.line};
  background: transparent;
  color: inherit;
  font-family: inherit;
  text-align: left;
  cursor: pointer;

  &:last-of-type {
    border-bottom: 0;
  }
`

const Rank = styled.span`
  width: 1.25rem;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 700;
`

const Info = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};
`

const Name = styled.span`
  overflow: hidden;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
`

const Rating = styled.span`
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.forest};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: 700;
`

export default PlayersAdminList
