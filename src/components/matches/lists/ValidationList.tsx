'use client'

import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { confirmMatch } from '@/app/actions/matches'
import { disputeMatch } from '@/app/actions/dispute'
import { deleteMatch } from '@/app/actions/admin-matches'
import { toast } from 'sonner'
import { Trash2, Pencil } from 'lucide-react'
import { Match } from '@/types'
import { EditMatchDialog } from '../dialogs/EditMatchDialog'

interface ValidationListProps {
  matches: Match[]
  userId: string
  userRole: string
}

export function ValidationList({ matches, userId, userRole }: ValidationListProps) {
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const router = useRouter()

  const handleAction = async (matchId: string, action: 'confirm' | 'delete' | 'dispute') => {
    setLoadingIds(prev => new Set(prev).add(matchId))
    
    const promise = action === 'confirm' 
      ? confirmMatch(matchId)
      : action === 'delete'
      ? deleteMatch(matchId)
      : disputeMatch(matchId)

    const loadingText = action === 'confirm' ? 'Confirmando...' : action === 'delete' ? 'Eliminando...' : 'Impugnando...'
    const successText = action === 'confirm' ? '¡Partido confirmado!' : action === 'delete' ? '¡Partido eliminado!' : '¡Partido impugnado!'

    toast.promise(promise, {
      loading: loadingText,
      success: (result: any) => {
        if (!result.success) throw new Error(result.error)
        router.refresh()
        return successText
      },
      error: (err) => {
        console.error(`Error al ${action}:`, err)
        return err.message || `Error al ${action} el partido`
      },
    })

    try {
      await promise
    } catch (error) {
      // Handled by toast.promise
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev)
        next.delete(matchId)
        return next
      })
    }
  }

  if (matches.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center text-gray-500">
          <p>No tienes partidos pendientes de validar.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {editingMatch && (
        <EditMatchDialog 
            match={editingMatch} 
            open={!!editingMatch} 
            onOpenChange={(open) => !open && setEditingMatch(null)} 
        />
      )}

      {matches.map((match) => (
        <div 
          key={match.id} 
          className="flex flex-col space-y-4 rounded-xl border border-gray-100 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 shadow-sm animate-in zoom-in-95 duration-300"
        >
            
            {/* Event & Court Banner */}
            {match.event && match.event.start_time && (
                <div className="w-full text-center bg-gray-50 dark:bg-gray-900/50 py-1 rounded-t border-b border-gray-100 dark:border-gray-800 text-[10px] sm:text-xs text-muted-foreground font-medium truncate px-2 mb-2 -mt-4 -ml-4 w-[calc(100%+2rem)] pt-2">
                    {(() => {
                        const startDate = new Date(match.event?.start_time!);
                        const totalDuration = match.event?.duration_minutes || 90;
                        const rounds = match.event?.rounds || 1;
                        const durationPerRound = totalDuration / rounds;
                        
                        const roundOffset = ((match.round_number || 1) - 1) * durationPerRound;
                        const matchDate = new Date(startDate.getTime() + roundOffset * 60000);
                        
                        // Force hydration match by using suppressHydrationWarning or simpler:
                        // Just use standard ISO or ensure we use a client component for the date.
                        // Here we use a trick: format it, but wrap in a span with suppressHydrationWarning
                        // to tell React it's okay if server/client differ.

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
                <div className="text-[10px] uppercase tracking-wider text-primary font-bold">Pareja A</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                  <p className="truncate" title={match.p_a1?.full_name}>
                    {match.p_a1?.full_name?.split(' ').slice(0, 2).map((n, i) => i === 1 ? n.charAt(0) + '.' : n).join(' ')}
                  </p>
                  <p className="truncate" title={match.p_a2?.full_name}>
                    {match.p_a2?.full_name?.split(' ').slice(0, 2).map((n, i) => i === 1 ? n.charAt(0) + '.' : n).join(' ')}
                  </p>
                </div>
              </div>

              {/* VS & Score */}
              <div className="flex flex-col items-center justify-center px-2 py-1 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 min-w-[70px] relative shrink-0">
                {match.match_type === 'mixing' ? (
                   <Badge variant="secondary" className="mb-1 text-[10px] px-1 h-4 bg-primary/10 text-primary hover:bg-primary/20">Mixing</Badge>
                ) : (
                   <span className="text-[10px] font-black text-secondary italic mb-1">VS</span>
                )}
                <div className="text-lg font-black leading-none text-gray-900 dark:text-white text-center">
                  {match.score_details}
                </div>
              </div>

              {/* Team B */}
              <div className="text-left space-y-0.5 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-secondary font-bold">Pareja B</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                  <p className="truncate" title={match.p_b1?.full_name}>
                    {match.p_b1?.full_name?.split(' ').slice(0, 2).map((n, i) => i === 1 ? n.charAt(0) + '.' : n).join(' ')}
                  </p>
                  <p className="truncate" title={match.p_b2?.full_name}>
                    {match.p_b2?.full_name?.split(' ').slice(0, 2).map((n, i) => i === 1 ? n.charAt(0) + '.' : n).join(' ')}
                  </p>
                </div>
              </div>
            </div>



            <div className="flex w-full sm:w-auto items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-50 dark:border-gray-700">
               {/* allow Edit if user is participant (implied by seeing it here) or admin */}
               {((match.status === 'pending' && match.score_details !== '0-0') || match.status === 'disputed') && (
                 <Button 
                   variant="outline" 
                   size="sm"
                   className="flex-1 sm:flex-none h-9 w-9 p-0 border-gray-200"
                   onClick={() => setEditingMatch(match)}
                   title="Editar resultado"
                 >
                   <Pencil className="w-4 h-4 text-gray-500" />
                 </Button>
               )}

               {(userRole === 'admin' || userId === match.creator_id) && (
                 <Button 
                   variant="destructive" 
                   size="sm"
                   className="flex-1 sm:flex-none h-9 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50 border border-red-100 dark:border-red-900"
                   onClick={() => {
                     if (window.confirm("¿Estás seguro de que quieres eliminar este partido? Esta acción no se puede deshacer.")) {
                       handleAction(match.id, 'delete')
                     }
                   }}
                   disabled={loadingIds.has(match.id)}
                 >
                   <Trash2 className="w-4 h-4 mr-1" />
                   Eliminar
                 </Button>
               )}
               
               {userRole !== 'admin' && userId !== match.creator_id && match.status !== 'disputed' && (
                 <Button 
                   variant="outline" 
                   size="sm"
                   className="flex-1 sm:flex-none text-amber-500 hover:text-amber-600 hover:bg-amber-50 border-amber-100 h-9"
                   onClick={() => {
                     if (window.confirm("¿El resultado es incorrecto? Al impugnar, el partido quedará bloqueado hasta que el creador o un admin lo revise.")) {
                       handleAction(match.id, 'dispute')
                     }
                   }}
                   disabled={loadingIds.has(match.id)}
                 >
                   Impugnar
                 </Button>
               )}

               {match.status === 'disputed' && (
                  <Badge variant="outline" className="border-red-200 text-red-500 bg-red-50 h-9 flex items-center px-3">
                    Impugnado
                  </Badge>
               )}
              
               {match.status !== 'disputed' && (
                 match.last_updated_by === userId && userRole !== 'admin' ? (
                     <div className="flex items-center text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded">
                         Esperando rival...
                     </div>
                 ) : match.score_details === '0-0' ? (
                     <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 sm:flex-none h-9 text-amber-600 hover:text-amber-700 hover:bg-amber-50 border border-amber-100 dark:border-amber-900/30 font-medium"
                        onClick={() => setEditingMatch(match)}
                    >
                         ✏️ Introduce resultado
                     </Button>
                 ) : (
                    <Button 
                    size="sm"
                    className="flex-1 sm:flex-none text-white shadow-md shadow-primary/20 h-9 font-bold"
                    onClick={() => handleAction(match.id, 'confirm')}
                    disabled={loadingIds.has(match.id)}
                    >
                    {loadingIds.has(match.id) ? '...' : 'Confirmar'}
                    </Button>
                 )
               )}
            </div>
          </div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 text-right">
            Registrado el {new Date(match.created_at).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  )
}
