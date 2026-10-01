'use client'

import { useState, useTransition } from 'react'
import styled from '@emotion/styled'
import { toast } from 'sonner'
import Button from '../atoms/Button'
import EmptyState from '../molecules/EmptyState'
import MatchResultCard from '../molecules/MatchResultCard'
import { getMatchHistory, type HistoryMatch } from '@/app/actions/matches'

interface HistoryListProps {
  initialMatches: HistoryMatch[]
  initialHasMore: boolean
}

// Dates arrive as ISO strings and are formatted here in Madrid time.
const formatDate = (iso: string) =>
  new Date(iso)
    .toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Madrid' })
    .replace(/\./g, '')

function HistoryList({ initialMatches, initialHasMore }: HistoryListProps) {
  const [matches, setMatches] = useState(initialMatches)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [page, setPage] = useState(1)
  const [isPending, startTransition] = useTransition()

  const loadMore = () => {
    startTransition(async () => {
      try {
        const next = await getMatchHistory(page + 1)
        setMatches(prev => [...prev, ...next.matches.filter(m => !prev.some(p => p.id === m.id))])
        setHasMore(next.hasMore)
        setPage(page + 1)
      } catch {
        toast.error('No se han podido cargar más partidos')
      }
    })
  }

  if (matches.length === 0) {
    return <EmptyState>Aún no tienes partidos registrados. ¡Es hora de saltar a la pista!</EmptyState>
  }

  return (
    <List>
      {matches.map(m => (
        <MatchResultCard
          key={m.id}
          date={formatDate(m.playedAt)}
          context={[m.title, m.clubName].filter(Boolean).join(' · ') || undefined}
          outcome={m.outcome}
          myTeam={m.myTeam}
          opponents={m.opponents}
          games={m.games}
        />
      ))}
      {hasMore && (
        <Button type="button" $variant="outline" $size="lg" disabled={isPending} onClick={loadMore}>
          {isPending ? 'Cargando…' : 'Cargar más'}
        </Button>
      )}
    </List>
  )
}

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

export default HistoryList
