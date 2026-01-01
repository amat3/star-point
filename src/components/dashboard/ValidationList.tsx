'use client'

import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { confirmMatch } from '@/app/actions/matches'
import { toast } from 'sonner'

interface Match {
  id: string
  created_at: string
  score_details: string
  player_a1: string
  player_a2: string
  player_b1: string
  player_b2: string
  status: string
  p_a1?: { full_name: string }
  p_a2?: { full_name: string }
  p_b1?: { full_name: string }
  p_b2?: { full_name: string }
}

interface ValidationListProps {
  matches: Match[]
  userId: string
}

export function ValidationList({ matches, userId }: ValidationListProps) {
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const router = useRouter()

  const handleConfirm = async (matchId: string) => {
    setLoadingIds(prev => new Set(prev).add(matchId))
    const promise = confirmMatch(matchId)
    
    toast.promise(promise, {
      loading: 'Confirmando partido...',
      success: (result) => {
        if (!result.success) throw new Error(result.error)
        router.refresh()
        return '¡Partido confirmado con éxito!'
      },
      error: (err) => {
        console.error('Error al confirmar:', err)
        return err.message || 'Error al confirmar el partido'
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
                <div className="text-[10px] uppercase tracking-wider text-indigo-500 font-bold">Equipo A</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                  <p className="truncate">{match.p_a1?.full_name}</p>
                  <p className="truncate">{match.p_a2?.full_name}</p>
                </div>
              </div>

              {/* VS & Score */}
              <div className="flex flex-col items-center justify-center px-2 py-1 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 min-w-[70px]">
                <span className="text-[10px] font-black text-lime-500 italic">VS</span>
                <div className="text-lg font-black leading-none text-gray-900 dark:text-white">
                  {match.score_details}
                </div>
              </div>

              {/* Team B */}
              <div className="text-left space-y-0.5">
                <div className="text-[10px] uppercase tracking-wider text-lime-600 font-bold">Equipo B</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                  <p className="truncate">{match.p_b1?.full_name}</p>
                  <p className="truncate">{match.p_b2?.full_name}</p>
                </div>
              </div>
            </div>

            <div className="flex w-full sm:w-auto items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-50 dark:border-gray-700">
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 sm:flex-none text-red-500 hover:text-red-600 hover:bg-red-50 border-red-100 h-9"
                onClick={() => alert('Funcionalidad de impugnación pendiente')}
              >
                Impugnar
              </Button>
              <Button 
                size="sm"
                className="flex-1 sm:flex-none bg-lime-500 text-white hover:bg-lime-600 shadow-md shadow-lime-500/20 h-9 font-bold"
                onClick={() => handleConfirm(match.id)}
                disabled={loadingIds.has(match.id)}
              >
                {loadingIds.has(match.id) ? '...' : 'Confirmar'}
              </Button>
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
