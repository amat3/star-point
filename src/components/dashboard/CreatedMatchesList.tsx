'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock } from 'lucide-react'

interface Match {
  id: string
  created_at: string
  score_details: string
  status: string
}

interface CreatedMatchesListProps {
  matches: Match[]
}

export function CreatedMatchesList({ matches }: CreatedMatchesListProps) {
  if (matches.length === 0) return null

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Mis Partidos Registrados
      </h2>
      <div className="space-y-3">
        {matches.map((match) => (
          <div 
            key={match.id} 
            className="flex flex-col items-start justify-between space-y-3 rounded-lg border border-gray-100 p-4 sm:flex-row sm:items-center sm:space-y-0 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm"
          >
            <div className="space-y-1">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(match.created_at).toLocaleDateString()}
              </div>
              <div className="font-medium text-gray-900 dark:text-white">
                Resultado: {match.score_details}
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-medium border border-amber-100 dark:border-amber-900/30">
              <Clock className="h-3 w-3" />
              <span>Esperando validación</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
