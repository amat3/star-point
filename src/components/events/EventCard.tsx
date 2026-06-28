'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, Users, UserMinus, UserPlus, Pencil, Trash2, X, Shuffle } from 'lucide-react'
import { MixingEvent } from '@/types/events'
import { joinEvent, leaveEvent, removeParticipant, deleteEvent } from '@/app/actions/events'
import { EditEventDialog } from './EditEventDialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import Link from 'next/link'

interface EventCardProps {
  event: MixingEvent
  userId: string
  userRole: string
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  return date.charAt(0).toUpperCase() + date.slice(1)
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

type PendingConfirm = {
  title: string
  description: string
  confirmLabel: string
  action: () => void
}

export function EventCard({ event, userRole }: EventCardProps) {
  const [isPending, startTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  const participantsCount = event.participants_count || 0
  const isJoined = event.is_joined

  const handleJoin = () => {
    startTransition(async () => {
      try {
        await joinEvent(event.id)
        toast.success("Te has apuntado al evento")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : String(error))
      }
    })
  }

  const handleLeave = () => {
    startTransition(async () => {
      try {
        await leaveEvent(event.id)
        toast.success("Te has dado de baja del evento")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : String(error))
      }
    })
  }

  const handleRemoveParticipant = (targetUserId: string) => {
    setPending({
      title: 'Eliminar jugador',
      description: '¿Estás seguro de eliminar a este jugador del evento?',
      confirmLabel: 'Eliminar',
      action: () => startTransition(async () => {
        try {
          await removeParticipant(event.id, targetUserId)
          toast.success("Jugador eliminado")
        } catch (error) {
          toast.error(error instanceof Error ? error.message : String(error))
        }
      }),
    })
  }

  const handleDeleteEvent = () => {
    setPending({
      title: 'Anular evento',
      description: '¿Estás seguro de anular este evento? Se borrarán todos los participantes.',
      confirmLabel: 'Anular evento',
      action: () => startTransition(async () => {
        try {
          await deleteEvent(event.id)
          toast.success("Evento anulado")
        } catch (error) {
          toast.error(error instanceof Error ? error.message : String(error))
        }
      }),
    })
  }

  return (
    <Card className="w-full relative overflow-hidden border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all px-0">
      <EditEventDialog open={editOpen} onOpenChange={setEditOpen} event={event} />
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => { if (!open) setPending(null) }}
        title={pending?.title ?? ''}
        description={pending?.description ?? ''}
        confirmLabel={pending?.confirmLabel}
        onConfirm={() => pending?.action()}
      />
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
            <Link href={`/events/${event.id}`} className="hover:underline">
                <CardTitle className="text-xl font-bold text-primary">{event.title}</CardTitle>
            </Link>
            {userRole === 'admin' && (
                <div className="flex gap-1">
                    <Link href={`/admin/events/${event.id}/generate`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Generar Ronda">
                            <Shuffle className="h-4 w-4" />
                        </Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setEditOpen(true)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleDeleteEvent}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-4">
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="w-4 h-4 mr-2 text-primary" />
            <span>{formatDate(event.start_time)}</span>
        </div>
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Clock className="w-4 h-4 mr-2 text-primary" />
            <span>{formatTime(event.start_time)} ({event.duration_minutes || 90} min)</span>
        </div>
        
        {/* Participants List */}
        <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Jugadores {Math.min(participantsCount, event.max_spots)}/{event.max_spots}
                </h4>
            </div>
            
            {/* Titulares */}
            <div className="space-y-1 pl-1 mb-4">
                {Array.from({ length: event.max_spots }).map((_, index) => {
                    const participant = event.participants?.[index]
                    return (
                        <div key={`main-${index}`} className="flex items-center justify-between text-sm h-6 group">
                            <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
                                <span className="text-base shrink-0">🎾</span>
                                <span className={`truncate ${participant ? "text-gray-700 dark:text-gray-200 font-medium" : "text-gray-300 dark:text-gray-600 font-light"}`}>
                                    {participant?.full_name || "Libre"}
                                </span>
                                {participant?.is_guest && (
                                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-1 rounded shrink-0">Inv.</span>
                                )}
                            </div>
                            {participant && userRole === 'admin' && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                    onClick={() => handleRemoveParticipant(participant.user_id)}
                                    title="Eliminar jugador"
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    )
                })}

            </div>

            {/* Reservas — solo si hay alguien en lista de espera */}
            {(() => {
                const MAX_RESERVES = 3
                const filledReserves = Math.max(0, participantsCount - event.max_spots)
                if (filledReserves === 0) return null
                const slotsToShow = Math.min(filledReserves + 1, MAX_RESERVES)
                return (
            <div className="border-t pt-2 mt-2">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Reservas {filledReserves}/{MAX_RESERVES}
                </h4>
                <div className="space-y-1 pl-1">
                    {Array.from({ length: slotsToShow }).map((_, index) => {
                        const reserveIndex = event.max_spots + index
                        const participant = event.participants?.[reserveIndex]
                        
                        return (
                            <div key={`reserve-${index}`} className="flex items-center justify-between text-sm h-6 group">
                                <div className="flex items-center overflow-hidden">
                                    <span className="mr-2 text-base text-amber-500 shrink-0">🎾</span>
                                    <span className={`truncate ${participant ? "text-amber-700 dark:text-amber-400 font-medium" : "text-gray-300 dark:text-gray-600 font-light"}`}>
                                        {participant?.full_name || "Hueco reserva"}
                                    </span>
                                </div>
                                {participant && userRole === 'admin' && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleRemoveParticipant(participant.user_id)}
                                        title="Eliminar jugador"
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
                )
            })()}
        </div>

      </CardContent>
      <CardFooter className="pt-2 mt-auto">
        {isJoined ? (
          <Button 
            variant="destructive" 
            className="w-full" 
            onClick={handleLeave} 
            disabled={isPending}
          >
            {isPending ? "Procesando..." : (
                <>
                    <UserMinus className="w-4 h-4 mr-2" />
                    Desapuntarme
                </>
            )}
          </Button>
        ) : (
          <Button 
            className="w-full bg-linear-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 text-white border-none shadow-md" 
            onClick={handleJoin} 
            disabled={isPending || participantsCount >= (event.max_spots + 4)}
          >
            {isPending ? "Procesando..." : (
                <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    {participantsCount >= event.max_spots ? "Apuntarme (Reserva)" : "Apuntarme"}
                </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
