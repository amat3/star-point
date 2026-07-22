'use client'

import { useState, useMemo } from 'react'
import { getPlayersRanking } from '@/app/actions/users'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, ChevronDown, ChevronUp, RefreshCw, ArrowDownAZ, Trophy } from 'lucide-react'
import { toTitleCase } from '@/lib/utils'

type Player = {
  id: string
  full_name: string | null
  rating: number
  matches_played: number
  court_position?: string | null
  gender?: string | null
}

const positionLabel: Record<string, string> = {
  drive: 'DRV',
  reves: 'REV',
  ambos: 'MIX',
}

export function PlayerRankingPanel() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'rating'>('name')

  const sorted = useMemo(() =>
    [...players].sort((a, b) =>
      sortBy === 'rating'
        ? (b.rating - a.rating) || (b.matches_played - a.matches_played)
        : (a.full_name ?? '').localeCompare(b.full_name ?? '', 'es')
    ), [players, sortBy]
  )

  const load = async () => {
    setLoading(true)
    try {
      const data = await getPlayersRanking()
      setPlayers(data)
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }

  const toggle = () => {
    if (!open && players.length === 0) {
      load()
    } else {
      setOpen(o => !o)
    }
  }

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
      <div className="flex items-center">
        <button
          onClick={toggle}
          className="flex-1 flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <span className="flex items-center gap-2 text-base sm:text-sm font-medium text-gray-900 dark:text-white">
            <Users className="h-5 w-5 sm:h-4 sm:w-4 text-primary" />
            Jugadores
            {players.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5">{players.length}</Badge>
            )}
          </span>
          <span className="flex items-center gap-2">
            {loading && <RefreshCw className="h-4 w-4 sm:h-3.5 sm:w-3.5 animate-spin text-muted-foreground" />}
            {open ? <ChevronUp className="h-5 w-5 sm:h-4 sm:w-4 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 sm:h-4 sm:w-4 text-muted-foreground" />}
          </span>
        </button>
        {open && (
          <button
            onClick={() => setSortBy(s => s === 'name' ? 'rating' : 'name')}
            className="px-3 py-3 text-muted-foreground hover:text-primary transition-colors border-l border-gray-100 dark:border-gray-700"
            title={sortBy === 'name' ? 'Ordenar por ranking' : 'Ordenar alfabéticamente'}
          >
            {sortBy === 'name'
              ? <Trophy className="h-5 w-5 sm:h-4 sm:w-4" />
              : <ArrowDownAZ className="h-5 w-5 sm:h-4 sm:w-4" />
            }
          </button>
        )}
      </div>

      {open && players.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            <span>Jugador</span>
            <span className="text-center">Pos</span>
            <span className="text-center">PJ</span>
            <span className="text-right">Rating</span>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {sorted.map((p, idx) => (
              <div
                key={p.id}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 px-4 py-2.5 text-base sm:text-sm hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
              >
                <span className="font-medium text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                  {sortBy === 'rating' && (
                    <span className="text-[10px] font-bold text-muted-foreground w-4 shrink-0">#{idx + 1}</span>
                  )}
                  {p.full_name ? toTitleCase(p.full_name) : '—'}
                </span>
                <span className="text-[10px] text-center text-muted-foreground">
                  {positionLabel[p.court_position ?? ''] ?? '—'}
                </span>
                <span className="text-[11px] text-center text-muted-foreground">{p.matches_played}</span>
                <span className="text-right font-mono text-xs font-bold text-primary">
                  {p.rating.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 flex justify-end">
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3 w-3 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
