'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { confirmMatch } from '@/app/actions/matches'
import { disputeMatch } from '@/app/actions/dispute'
import { deleteMatch } from '@/app/actions/admin-matches'
import { toast } from 'sonner'
import { Trash2, Pencil } from 'lucide-react'
import { Match } from '@/types'
import { formatPlayerName } from '@/lib/utils'
import { EditMatchDialog } from '../dialogs/EditMatchDialog'

interface ValidationListProps {
  matches: Match[]
  userId: string
  userRole: string
}

type PendingConfirm = { title: string; description: string; confirmLabel: string; variant?: 'destructive' | 'outline'; action: () => void }

function MatchCard({
  match,
  userId,
  userRole,
  loadingIds,
  onAction,
  onEdit,
}: {
  match: Match
  userId: string
  userRole: string
  loadingIds: Set<string>
  onAction: (id: string, action: 'confirm' | 'delete' | 'dispute') => void
  onEdit: (match: Match) => void
}) {
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  return (
    <>
    <ConfirmDialog
      open={pending !== null}
      onOpenChange={(open) => { if (!open) setPending(null) }}
      title={pending?.title ?? ''}
      description={pending?.description ?? ''}
      confirmLabel={pending?.confirmLabel}
      variant={pending?.variant}
      onConfirm={() => pending?.action()}
    />
    <div className="flex flex-col rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
      {/* Court title header */}
      {match.court_number && (
        <div className="px-4 py-2 bg-primary/5 dark:bg-primary/10 border-b border-gray-100 dark:border-gray-700">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            Pista {match.court_number}{match.court_name ? ` · ${match.court_name}` : ''}
          </span>
        </div>
      )}
      <div className="flex flex-col space-y-3 p-4">

      {/* Event banner for standard matches */}
      {match.event && match.event.start_time && !match.round_number && (
        <div className="w-full text-center bg-gray-50 dark:bg-gray-900/50 py-1 rounded border-b border-gray-100 dark:border-gray-800 text-[10px] text-muted-foreground font-medium truncate px-2">
          <span className="font-bold text-primary" suppressHydrationWarning>
            {new Date(match.event.start_time).toLocaleDateString('es-ES', {
              weekday: 'long', day: 'numeric', month: 'long'
            })}
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="w-full sm:w-auto grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          {/* Team A */}
          {(() => {
            const pa1 = formatPlayerName(match.p_a1)
            const pa2 = formatPlayerName(match.p_a2)
            const pb1 = formatPlayerName(match.p_b1)
            const pb2 = formatPlayerName(match.p_b2)
            const guestBadge = <span className="text-[9px] text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-1 rounded shrink-0">Inv.</span>
            return <>
              <div className="text-right space-y-0.5 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400 font-bold">Pareja A</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                  <p className="truncate flex items-center justify-end gap-1" title={match.p_a1?.full_name}>
                    {pa1.isGuest && guestBadge}{pa1.name}
                  </p>
                  <p className="truncate flex items-center justify-end gap-1" title={match.p_a2?.full_name}>
                    {pa2.isGuest && guestBadge}{pa2.name}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center px-2 py-1 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 min-w-17.5 shrink-0">
                <span className="text-[10px] font-black text-secondary italic mb-1">VS</span>
                <div className="text-lg font-black leading-none text-gray-900 dark:text-white text-center">
                  {match.score_details}
                </div>
              </div>

              <div className="text-left space-y-0.5 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400 font-bold">Pareja B</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                  <p className="truncate flex items-center gap-1" title={match.p_b1?.full_name}>
                    {pb1.name}{pb1.isGuest && guestBadge}
                  </p>
                  <p className="truncate flex items-center gap-1" title={match.p_b2?.full_name}>
                    {pb2.name}{pb2.isGuest && guestBadge}
                  </p>
                </div>
              </div>
            </>
          })()}
        </div>

        <div className="flex w-full sm:w-auto items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-50 dark:border-gray-700">
          {((match.status === 'pending' && match.score_details !== '0-0') || match.status === 'disputed') && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none h-9 w-9 p-0 border-gray-200"
              onClick={() => onEdit(match)}
              title="Editar resultado"
            >
              <Pencil className="w-4 h-4 text-gray-500" />
            </Button>
          )}

          {userRole === 'admin' && (
            <Button
              variant="destructive"
              size="sm"
              className="flex-1 sm:flex-none h-9 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50 border border-red-100 dark:border-red-900"
              onClick={() => setPending({
                title: 'Eliminar partido',
                description: '¿Estás seguro de que quieres eliminar este partido? Esta acción no se puede deshacer.',
                confirmLabel: 'Eliminar',
                variant: 'destructive',
                action: () => onAction(match.id, 'delete'),
              })}
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
              onClick={() => setPending({
                title: 'Impugnar partido',
                description: '¿El resultado es incorrecto? Al impugnar, el partido quedará bloqueado hasta que el creador o un admin lo revise.',
                confirmLabel: 'Impugnar',
                variant: 'outline',
                action: () => onAction(match.id, 'dispute'),
              })}
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
                onClick={() => onEdit(match)}
              >
                ✏️ Introduce resultado
              </Button>
            ) : (
              <Button
                size="sm"
                className="flex-1 sm:flex-none text-white shadow-md shadow-primary/20 h-9 font-bold"
                onClick={() => onAction(match.id, 'confirm')}
                disabled={loadingIds.has(match.id)}
              >
                {loadingIds.has(match.id) ? '...' : 'Confirmar'}
              </Button>
            )
          )}
        </div>
      </div>
      </div>
    </div>
    </>
  )
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
      success: (result: { success: boolean; error?: string }) => {
        if (!result.success) throw new Error(result.error)
        router.refresh()
        return successText
      },
      error: (err) => err.message || `Error al ${action} el partido`,
    })

    try {
      await promise
    } catch {
      // handled by toast.promise
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
      <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
        <p className="text-muted-foreground text-sm">No tienes partidos pendientes de validar.</p>
      </div>
    )
  }

  // Separate mixing (with round) from standard matches
  const roundMatches = matches.filter(m => m.round_number)
  const standardMatches = matches.filter(m => !m.round_number)

  // Group mixing matches by round_number, then sort courts within each round
  const roundGroups = roundMatches.reduce((acc, match) => {
    const round = match.round_number!
    if (!acc[round]) acc[round] = []
    acc[round].push(match)
    return acc
  }, {} as Record<number, Match[]>)

  const sortedRounds = Object.keys(roundGroups).map(Number).sort((a, b) => a - b)

  const sharedProps = {
    userId,
    userRole,
    loadingIds,
    onAction: handleAction,
    onEdit: setEditingMatch,
  }

  return (
    <div className="space-y-6">
      {editingMatch && (
        <EditMatchDialog
          match={editingMatch}
          open={!!editingMatch}
          onOpenChange={(open) => !open && setEditingMatch(null)}
        />
      )}

      {/* Grouped by round */}
      {sortedRounds.map(round => {
        const roundMatchList = roundGroups[round].sort((a, b) => (a.court_number ?? 0) - (b.court_number ?? 0))

        return (
          <div key={round} className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-900 dark:text-white">Ronda {round}</span>
            </div>

            <div className="pl-3 border-l-2 border-primary/20 space-y-2">
              {roundMatchList.map(match => (
                <MatchCard key={match.id} match={match} {...sharedProps} />
              ))}
            </div>
          </div>
        )
      })}

      {/* Standard matches (no round) */}
      {standardMatches.length > 0 && (
        <div className="space-y-3">
          {sortedRounds.length > 0 && (
            <span className="text-sm font-bold text-gray-900 dark:text-white">Partidos estándar</span>
          )}
          <div className="space-y-3">
            {standardMatches.map(match => (
              <MatchCard key={match.id} match={match} {...sharedProps} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
