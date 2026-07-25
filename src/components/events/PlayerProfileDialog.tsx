'use client'

import { useEffect, useState } from 'react'
import { Trophy, Pencil, Check, X } from 'lucide-react'
import { ThinkingOrb } from 'thinking-orbs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PlayerStatsCard } from '@/components/dashboard/PlayerStatsCard'
import { getPlayerProfileDetails, type PlayerProfileDetails } from '@/app/actions/matches'
import { renameGuest } from '@/app/actions/events'
import { toTitleCase } from '@/lib/utils'
import { toast } from 'sonner'

interface PlayerProfileDialogProps {
  userId: string | null
  userRole?: string
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

export function PlayerProfileDialog({ userId, userRole, open, onOpenChange }: PlayerProfileDialogProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<PlayerProfileDetails | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)

  useEffect(() => {
    if (!open || !userId) return

    async function load() {
      setLoading(true)
      setData(null)
      setEditingName(false)
      const result = await getPlayerProfileDetails(userId!)
      setData(result)
      setLoading(false)
    }

    load()
  }, [open, userId])

  function startEditingName() {
    setNameDraft(data?.full_name ?? '')
    setEditingName(true)
  }

  async function saveName() {
    if (!data) return
    setSavingName(true)
    try {
      await renameGuest(data.id, nameDraft)
      setData({ ...data, full_name: nameDraft.trim() })
      setEditingName(false)
      toast.success('Nombre actualizado')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al renombrar')
    } finally {
      setSavingName(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Perfil del Jugador</DialogTitle>
          <DialogDescription className="sr-only">
            Datos y estadísticas del jugador seleccionado
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center py-8">
            <ThinkingOrb state="composing" size={20} theme="auto" aria-label="Cargando…" />
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
              {editingName ? (
                <div className="flex items-center gap-1 w-full max-w-56">
                  <Input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    className="h-8 text-center"
                    autoFocus
                    disabled={savingName}
                  />
                  <Button size="icon" className="h-8 w-8 shrink-0" onClick={saveName} disabled={savingName}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setEditingName(false)} disabled={savingName}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold">{toTitleCase(data.full_name)}</span>
                  {userRole === 'admin' && data.is_guest && (
                    <button
                      type="button"
                      onClick={startEditingName}
                      className="text-muted-foreground hover:text-primary"
                      title="Editar nombre del invitado"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
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
