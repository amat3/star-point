'use client'

import { useState, useEffect } from 'react'
import { getUserMatches } from '@/app/actions/matches'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Calendar, History } from 'lucide-react'
import { formatPlayerName } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface MatchHistoryProps {
  userId: string
}

export function MatchHistory({ userId }: MatchHistoryProps) {
  const [filter, setFilter] = useState<'3' | '6' | 'all'>('3')
  const [page, setPage] = useState(1)
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  // Reset page when filter changes
  useEffect(() => {
    setPage(1)
  }, [filter])

  useEffect(() => {
    async function loadMatches() {
      setLoading(true)
      try {
        const limit = filter === 'all' ? 10 : parseInt(filter)
        const { matches: data, totalCount } = await getUserMatches(userId, limit, page)
        setMatches(data)
        setTotalCount(totalCount)
      } catch (error) {
        console.error("Error loading matches:", error)
      } finally {
        setLoading(false)
      }
    }

    loadMatches()
  }, [userId, filter, page])

  const totalPages = Math.ceil(totalCount / 10)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Historial de Partidos
        </h2>
        <div className="w-[140px]">
             <Select value={filter} onValueChange={(val: any) => setFilter(val)}>
                <SelectTrigger>
                    <SelectValue placeholder="Filtrar" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="3">3 últimos</SelectItem>
                    <SelectItem value="6">6 últimos</SelectItem>
                    <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
             </Select>
        </div>
      </div>
      <Card className="shadow-lg border-none ring-1 ring-gray-200 dark:ring-gray-800">
      {/* Removed CardHeader */}
      <CardContent className="space-y-4 pt-6">
        {loading ? (
             <div className="flex flex-col gap-4">
                 {[1, 2, 3].map(i => (
                     <div key={i} className="h-24 w-full bg-muted/40 animate-pulse rounded-lg" />
                 ))}
             </div>
        ) : matches.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center gap-2">
                 <p className="text-muted-foreground text-sm">Aún no tienes partidos registrados. ¡Es hora de saltar a la pista!</p>
            </div>
        ) : (
            <div className="flex flex-col gap-3">
                {matches.map(match => {
                    // Determine User Team and Result
                    const isTeamA = match.player_a1 === userId || match.player_a2 === userId
                    const { gamesA, gamesB } = getScoreDetails(match)

                    const teamAWon = gamesA > gamesB
                    const userWon = isTeamA ? teamAWon : !teamAWon

                    const resultLabel = userWon ? 'Victoria' : 'Derrota'
                    const borderColor = userWon ? 'border-l-green-500' : 'border-l-red-500'
                    const scoreText = `${gamesA} - ${gamesB}`

                    const pa1 = formatPlayerName(match.p_a1)
                    const pa2 = formatPlayerName(match.p_a2)
                    const pb1 = formatPlayerName(match.p_b1)
                    const pb2 = formatPlayerName(match.p_b2)

                    return (
                        <div key={match.id} className={`flex flex-col bg-card hover:bg-accent/5 transition-colors rounded-r-lg border-y border-r border-l-4 ${borderColor} p-3 sm:p-4 shadow-sm`}>

                            {/* Header: Date & Badge */}
                            <div className="flex justify-between items-center text-xs text-muted-foreground mb-3">
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span>{format(new Date(match.created_at), "d MMM yyyy", { locale: es })}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {match.event?.title && <span className="font-medium text-foreground">{match.event.title}</span>}
                                    <Badge variant="outline" className={`text-[10px] px-1.5 h-5 border-0 ${userWon ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'}`}>
                                        {resultLabel}
                                    </Badge>
                                </div>
                            </div>

                            {/* Match Content: Team A | Score | Team B */}
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                                {/* Team A */}
                                <div className="text-right space-y-0.5 min-w-0">
                                    <div className="text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400 font-bold">Pareja A</div>
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                                        <p className="truncate flex items-center justify-end gap-1">
                                            {pa1.isGuest && <span className="text-[9px] text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1 rounded shrink-0">Inv.</span>}
                                            {pa1.name}
                                        </p>
                                        <p className="truncate flex items-center justify-end gap-1">
                                            {pa2.isGuest && <span className="text-[9px] text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1 rounded shrink-0">Inv.</span>}
                                            {pa2.name}
                                        </p>
                                    </div>
                                </div>

                                {/* Score */}
                                <div className="flex flex-col items-center justify-center px-2 py-1 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 shrink-0">
                                    <span className="text-[10px] font-black text-secondary italic mb-1">VS</span>
                                    <div className="text-lg font-black leading-none text-gray-900 dark:text-white text-center whitespace-nowrap">
                                        {scoreText}
                                    </div>
                                </div>

                                {/* Team B */}
                                <div className="text-left space-y-0.5 min-w-0">
                                    <div className="text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400 font-bold">Pareja B</div>
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                                        <p className="truncate flex items-center gap-1">
                                            {pb1.name}
                                            {pb1.isGuest && <span className="text-[9px] text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1 rounded shrink-0">Inv.</span>}
                                        </p>
                                        <p className="truncate flex items-center gap-1">
                                            {pb2.name}
                                            {pb2.isGuest && <span className="text-[9px] text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1 rounded shrink-0">Inv.</span>}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        )}

        {/* Pagination Controls */}
        {filter === 'all' && totalCount > 10 && (
            <div className="flex items-center justify-center gap-4 pt-4">
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                </span>
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        )}
      </CardContent>
    </Card>
    </div>
  )
}

function getScoreDetails(match: any) {
    const parts = (match.score_details || '0-0').split('-')
    return {
        gamesA: parseInt(parts[0] || '0'),
        gamesB: parseInt(parts[1] || '0'),
    }
}
