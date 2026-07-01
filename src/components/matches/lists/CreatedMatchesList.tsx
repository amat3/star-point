'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Clock, Pencil } from 'lucide-react'
import { Match } from '@/types'
import { Button } from '@/components/ui/button'
import { EditMatchDialog } from '../dialogs/EditMatchDialog'
import { toTitleCase } from '@/lib/utils'

interface CreatedMatchesListProps {
  matches: Match[]
}

export function CreatedMatchesList({ matches }: CreatedMatchesListProps) {
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)

  if (matches.length === 0) {
    return (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center gap-2">
            <p className="text-muted-foreground text-sm">No has registrado ningún partido pendiente.</p>
        </div>
    )
  }

  return (
    <div className="bg-white/50 dark:bg-gray-800/10 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-800">
      <div className="space-y-4">
      {editingMatch && (
        <EditMatchDialog 
            match={editingMatch} 
            open={!!editingMatch} 
            onOpenChange={(open) => !open && setEditingMatch(null)} 
        />
      )}
      
    <div className="space-y-3">
        {matches.map((match) => (
          <div 
            key={match.id} 
            className="flex flex-col space-y-3 rounded-xl border border-gray-100 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 shadow-sm animate-in zoom-in-95 duration-300"
          >
              {/* Event & Court Banner */}
            {match.event && match.event.start_time && (
                <div className="w-full text-center bg-gray-50 dark:bg-gray-900/50 py-1 rounded-t border-b border-gray-100 dark:border-gray-800 text-[10px] sm:text-xs text-muted-foreground font-medium truncate px-2 mb-2">
                    {(() => {
                        const startDate = new Date(match.event?.start_time ?? '');
                        const totalDuration = match.event?.duration_minutes || 90;
                        const rounds = match.event?.rounds || 1;
                        const durationPerRound = totalDuration / rounds;
                        
                        const roundOffset = ((match.round_number || 1) - 1) * durationPerRound;
                        const matchDate = new Date(startDate.getTime() + roundOffset * 60000);
                        
                        const dateStr = matchDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
                            .replace(/ de /g, ' ');
                        
                        const timeStr = matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        
                        const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

                        return (
                            <span className="font-bold text-primary" suppressHydrationWarning>
                                {formattedDate} · {timeStr} {match.court_number && ` · Pista ${match.court_number}`}
                            </span>
                        );
                    })()}
                </div>
            )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="w-full sm:w-auto grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                {/* Team A */}
                <div className="text-right space-y-0.5 min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-indigo-500 font-bold">Pareja A</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                    <p className="truncate" title={match.p_a1?.full_name}>
                        {toTitleCase(match.p_a1?.full_name)}
                    </p>
                    <p className="truncate" title={match.p_a2?.full_name}>
                        {toTitleCase(match.p_a2?.full_name)}
                    </p>
                  </div>
                </div>

                {/* VS & Score */}
                <div className="flex flex-col items-center justify-center px-2 py-1 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 min-w-17.5 relative shrink-0">
                  {match.match_type === 'mixing' ? (
                     <Badge variant="secondary" className="mb-1 text-[10px] px-1 h-4 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">Mixing</Badge>
                  ) : (
                     <span className="text-[10px] font-black text-lime-500 italic">VS</span>
                  )}
                  <div className="text-lg font-black leading-none text-gray-900 dark:text-white text-center">
                    {match.score_details}
                  </div>
                </div>

                {/* Team B */}
                <div className="text-left space-y-0.5 min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-lime-600 font-bold">Pareja B</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                    <p className="truncate" title={match.p_b1?.full_name}>
                        {toTitleCase(match.p_b1?.full_name)}
                    </p>
                    <p className="truncate" title={match.p_b2?.full_name}>
                        {toTitleCase(match.p_b2?.full_name)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex w-full sm:w-auto items-center justify-center sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-50 dark:border-gray-700">
                 {(match.status === 'pending' || match.status === 'disputed') && (
                     <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-none h-9 w-9 p-0 border-gray-200"
                        onClick={() => setEditingMatch(match)}
                        title="Editar resultado"
                     >
                        <Pencil className="h-4 w-4 text-gray-500" />
                     </Button>
                 )}
                 <div className="flex items-center justify-center space-x-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-3 h-9 rounded-2xl text-[10px] font-bold border border-amber-100 dark:border-amber-900/30 uppercase tracking-tight">
                    <Clock className="h-3 w-3" />
                    <span>{match.status === 'disputed' ? 'Impugnado' : 'Pendiente'}</span>
                 </div>
              </div>
            </div>
            <div className="text-[10px] text-gray-400 dark:text-gray-500 text-right">
              Registrado el {new Date(match.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  )
}
