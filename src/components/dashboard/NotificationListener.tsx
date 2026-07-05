'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PartyPopper } from 'lucide-react'

interface NotificationRow {
  id: string
  event_id: string | null
  message: string
  event_title?: string | null
  event_start_time?: string | null
}

function formatEventDate(dateStr: string) {
  const date = new Date(dateStr)
  const day = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' })
  const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' })
  return `${day.charAt(0).toUpperCase() + day.slice(1)}, ${time}`
}

export function NotificationListener({ userId }: { userId: string }) {
  const [queue, setQueue] = useState<NotificationRow[]>([])

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    const enqueue = (notification: NotificationRow) => {
      setQueue((prev) => [...prev, notification])
    }

    const init = async () => {
      // Realtime necesita el JWT de sesión cargado antes de suscribirse,
      // si no la conexión queda como anon y la RLS bloquea el evento.
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (session) {
        supabase.realtime.setAuth(session.access_token)
      }

      supabase
        .from('notifications')
        .select('id, event_id, message, events(title, start_time)')
        .eq('user_id', userId)
        .is('read_at', null)
        .order('created_at', { ascending: true })
        .then(({ data }) => {
          data?.forEach((notification) => {
            const event = Array.isArray(notification.events) ? notification.events[0] : notification.events
            enqueue({
              id: notification.id,
              event_id: notification.event_id,
              message: notification.message,
              event_title: event?.title,
              event_start_time: event?.start_time,
            })
          })
        })

      channel = supabase
        .channel('notifications-listener')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          async (payload) => {
            const notification = payload.new as NotificationRow
            if (notification.event_id) {
              const { data: event } = await supabase
                .from('events')
                .select('title, start_time')
                .eq('id', notification.event_id)
                .single()
              enqueue({ ...notification, event_title: event?.title, event_start_time: event?.start_time })
            } else {
              enqueue(notification)
            }
          }
        )
        .subscribe()
    }

    init()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [userId])

  const current = queue[0]

  const dismiss = () => {
    if (!current) return
    const supabase = createClient()
    supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', current.id)
      .then(() => {})
    setQueue((prev) => prev.slice(1))
  }

  return (
    <Dialog open={!!current}>
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="sm:max-w-lg w-[calc(100%-1rem)] h-[85vh] sm:h-auto flex flex-col items-center justify-center text-center gap-6 p-8"
      >
        <PartyPopper className="h-16 w-16 text-primary" />
        <DialogHeader className="items-center">
          <DialogTitle className="text-2xl">¡Pasas a titular!</DialogTitle>
          <DialogDescription asChild>
            <div className="text-base text-center space-y-1">
              <p>Has pasado a titular en</p>
              {current?.event_title && (
                <p className="font-semibold text-foreground">&quot;{current.event_title}&quot;</p>
              )}
              {current?.event_start_time && (
                <p>{formatEventDate(current.event_start_time)}</p>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="w-full">
          <Button className="w-full" onClick={dismiss}>
            Aceptar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
