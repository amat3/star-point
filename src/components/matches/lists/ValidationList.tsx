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
import { Trash2 } from 'lucide-react'
import { Match } from '@/types'

interface ValidationListProps {
  matches: Match[]
  userId: string
  userRole: string
}

export function ValidationList({ matches, userId, userRole }: ValidationListProps) {
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
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
      {matches.map((match) => (
        <div 
          key={match.id} 
          className="flex flex-col space-y-4 rounded-xl border border-gray-100 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 shadow-sm animate-in zoom-in-95 duration-300"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              {/* Team A */}
              <div className="text-right space-y-0.5">
                <div className="text-[10px] uppercase tracking-wider text-indigo-500 font-bold">Pareja A</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                  <p className="truncate">{match.p_a1?.full_name}</p>
                  <p className="truncate">{match.p_a2?.full_name}</p>
                </div>
              </div>

              {/* VS & Score */}
              <div className="flex flex-col items-center justify-center px-2 py-1 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 min-w-[70px] relative">
                {match.match_type === 'mixing' ? (
                   <Badge variant="secondary" className="mb-1 text-[10px] px-1 h-4 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">Mixing</Badge>
                ) : (
                   <span className="text-[10px] font-black text-lime-500 italic mb-1">VS</span>
                )}
                <div className="text-lg font-black leading-none text-gray-900 dark:text-white text-center">
                  {match.score_details}
                </div>
              </div>

              {/* Team B */}
              <div className="text-left space-y-0.5">
                <div className="text-[10px] uppercase tracking-wider text-lime-600 font-bold">Pareja B</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                  <p className="truncate">{match.p_b1?.full_name}</p>
                  <p className="truncate">{match.p_b2?.full_name}</p>
                </div>
              </div>
            </div>

            <div className="flex w-full sm:w-auto items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-50 dark:border-gray-700">
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
                <Button 
                  size="sm"
                  className="flex-1 sm:flex-none bg-lime-500 text-white hover:bg-lime-600 shadow-md shadow-lime-500/20 h-9 font-bold"
                  onClick={() => handleAction(match.id, 'confirm')}
                  disabled={loadingIds.has(match.id)}
                >
                  {loadingIds.has(match.id) ? '...' : 'Confirmar'}
                </Button>
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
