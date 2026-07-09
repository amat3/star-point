'use client'

import { useEffect, useState } from 'react'
import { Loader2, Trophy } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PlayerStatsCard } from '@/components/dashboard/PlayerStatsCard'
import { getPlayerProfileDetails, type PlayerProfileDetails } from '@/app/actions/matches'
import { toTitleCase } from '@/lib/utils'

interface PlayerProfileDialogProps {
  userId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const GENDER_LABEL: Record<string, string> = {
  masculino: 'Masculino',
  femenino: 'Femenino',
}

const HAND_LABEL: Record<string, string> = {
  diestro: 'Diestro',
  zurdo: 'Zurdo',
  ambidiestro: 'Ambidiestro',
}

const POSITION_LABEL: Record<string, string> = {
  reves: 'Revés (Izquierda)',
  drive: 'Drive (Derecha)',
  ambos: 'Ambos Lados',
}

function InfoRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

export function PlayerProfileDialog({ userId, open, onOpenChange }: PlayerProfileDialogProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<PlayerProfileDetails | null>(null)

  useEffect(() => {
    if (!open || !userId) return

    async function load() {
      setLoading(true)
      setData(null)
      const result = await getPlayerProfileDetails(userId!)
      setData(result)
      setLoading(false)
    }

    load()
  }, [open, userId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Perfil del Jugador</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && !data && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No se pudo cargar el perfil de este jugador.
          </p>
        )}

        {!loading && data && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-24 w-24 border-2 border-lime-500">
                <AvatarImage src={data.avatar_url ?? undefined} />
                <AvatarFallback className="bg-lime-100 text-lime-800 text-3xl font-bold">
                  {(data.full_name ?? '?').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-lg font-bold">{toTitleCase(data.full_name)}</span>
            </div>

            <div className="space-y-1.5 border-t pt-3">
              <InfoRow label="Género" value={data.gender ? (GENDER_LABEL[data.gender] ?? 'No especificado') : 'No especificado'} />
              <InfoRow label="Mano Preferida" value={data.preferred_hand ? (HAND_LABEL[data.preferred_hand] ?? 'No especificado') : 'No especificado'} />
              <InfoRow label="Posición en Pista" value={data.court_position ? (POSITION_LABEL[data.court_position] ?? 'No especificado') : 'No especificado'} />
            </div>

            <div className="border-t pt-3">
              <PlayerStatsCard
                matchesPlayed={data.matches_played}
                gamesWon={data.gamesWon}
                gamesLost={data.gamesLost}
              />
            </div>

            <div className="flex flex-col items-center gap-1 border-t pt-3">
              <Trophy className="h-4 w-4 text-lime-500" />
              <span className="text-2xl font-bold">{(data.win_ratio * 100).toFixed(0)}%</span>
              <span className="text-xs text-muted-foreground">Ratio de Victoria</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
