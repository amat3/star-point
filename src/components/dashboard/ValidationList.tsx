'use client'

import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { confirmMatch } from '@/app/actions/matches'

interface Match {
  id: string
  created_at: string
  score_details: string
  player_a1: string
  player_a2: string
  player_b1: string
  player_b2: string
  status: string
}

interface ValidationListProps {
  matches: any[]
  userId: string
}

export function ValidationList({ matches, userId }: ValidationListProps) {
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const router = useRouter()

  const handleConfirm = async (matchId: string) => {
    setLoadingIds(prev => new Set(prev).add(matchId))
    
    try {
      const result = await confirmMatch(matchId)
      if (!result.success) {
        throw new Error(result.error)
      }
      // Refresh the page to show updated ratings
      router.refresh()
    } catch (error: any) {
      console.error('Error confirming match:', error)
      alert(error.message || 'Error al confirmar el partido')
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
          className="flex flex-col items-start justify-between space-y-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:space-y-0 bg-white dark:bg-gray-800"
        >
          <div className="space-y-1">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(match.created_at).toLocaleDateString()}
            </div>
            <div className="font-medium text-gray-900 dark:text-white">
              Resultado: {match.score_details}
            </div>
          </div>
          <div className="flex w-full flex-shrink-0 flex-wrap gap-2 sm:w-auto sm:space-x-2">
            <Button 
              variant="outline" 
              className="flex-1 sm:flex-none text-red-500 hover:text-red-600 hover:bg-red-50 px-2 sm:px-4 text-xs sm:text-sm"
              onClick={() => alert('Funcionalidad de impugnación pendiente')}
            >
              Impugnar
            </Button>
            <Button 
              className="flex-1 sm:flex-none bg-lime-500 text-white hover:bg-lime-600 dark:bg-lime-600 dark:hover:bg-lime-700 px-2 sm:px-4 text-xs sm:text-sm"
              onClick={() => handleConfirm(match.id)}
              disabled={loadingIds.has(match.id)}
            >
              {loadingIds.has(match.id) ? 'Confirmando...' : 'Confirmar'}
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
