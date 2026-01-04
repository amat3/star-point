'use client'

import { useState, useEffect } from 'react'
import { getUserMatches } from '@/app/actions/matches'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ChevronLeft, ChevronRight, Calendar, Trophy, History } from 'lucide-react'
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
                    const isMixing = match.match_type === 'mixing'
                    const { gamesA, gamesB, setsA, setsB } = getScoreDetails(match)
                    
                    const teamAWon = isMixing ? (gamesA > gamesB) : (setsA > setsB)
                    const userWon = isTeamA ? teamAWon : !teamAWon
                    
                    const resultLabel = userWon ? 'Victoria' : 'Derrota'
                    const borderColor = userWon ? 'border-l-green-500' : 'border-l-red-500'
                    const scoreText = isMixing ? `${gamesA} - ${gamesB}` : match.score_details

                    // Names formatting
                    const teamANames = `${match.player_a1?.full_name?.split(' ')[0]} / ${match.player_a2?.full_name?.split(' ')[0]}`
                    const teamBNames = `${match.player_b1?.full_name?.split(' ')[0]} / ${match.player_b2?.full_name?.split(' ')[0]}`
                    
                    return (
                        <div key={match.id} className={`flex flex-col bg-card hover:bg-accent/5 transition-colors rounded-r-lg border-y border-r border-l-4 ${borderColor} p-3 sm:p-4 shadow-sm relative overflow-hidden`}>
                             
                             {/* Header: Date & Badge */}
                             <div className="flex justify-between items-center text-xs text-muted-foreground mb-3">
                                 <div className="flex items-center gap-1.5">
                                     <Calendar className="h-3.5 w-3.5" />
                                     <span>{format(new Date(match.created_at), "d MMM yyyy", { locale: es })}</span>
                                 </div>
                                 <div className="flex items-center gap-2">
                                     <span className="font-medium text-foreground">{match.event?.title || (isMixing ? 'Mixing' : 'Partido')}</span>
                                     <Badge variant="outline" className={`text-[10px] px-1.5 h-5 border-0 ${userWon ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'}`}>
                                         {resultLabel}
                                     </Badge>
                                 </div>
                             </div>

                             {/* Match Content */}
                             <div className="flex items-center justify-between gap-4">
                                 
                                 {/* Teams (Stacked Left) */}
                                 <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                      {/* Team A */}
                                      <div className="text-sm font-semibold text-foreground truncate">
                                          {teamANames}
                                      </div>

                                      {/* Team B */}
                                      <div className="text-sm font-semibold text-foreground truncate">
                                          {teamBNames}
                                      </div>
                                 </div>

                                 {/* Score (Right) */}
                                 <div className="flex items-center justify-end gap-2 min-w-[60px]">
                                     {isMixing ? (
                                         <div className="text-xl font-mono font-bold tracking-tight bg-secondary/50 px-2 py-1.5 rounded-md whitespace-nowrap text-center">
                                            {scoreText}
                                         </div>
                                     ) : (
                                         (scoreText.match(/(\d+-\d+)/g) || [scoreText]).map((part: string, i: number) => (
                                            <div key={i} className="text-xl font-mono font-bold tracking-tight bg-secondary/50 px-2 py-1.5 rounded-md whitespace-nowrap text-center">
                                                {part}
                                            </div>
                                         ))
                                     )}
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
    // Helper to extract numeric scores safely
    let gamesA = 0, gamesB = 0
    // Try calculate from sets or mixing games if available in raw text?
    // Actually match object might not have computed games if not mixing.
    // But for mixing we saved games only in score_details as "X-Y"? No, we saved sets=0.
    
    // The server action returns raw fields.
    // For standard, we have sets_a, sets_b.
    // For mixing, we rely on score parsing or assume logic.
    
    // Let's parse score_details "6-4 6-2" -> Sets win?
    // Simple logic: trust sets_a/sets_b for standard.
    
    if (match.match_type === 'mixing') {
        const parts = (match.score_details || "0-0").split('-')
        gamesA = parseInt(parts[0] || '0')
        gamesB = parseInt(parts[1] || '0')
    }
    
    return {
        setsA: match.sets_a || 0,
        setsB: match.sets_b || 0,
        gamesA,
        gamesB
    }
}
