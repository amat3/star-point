'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import styled from '@emotion/styled'
import Button from '@/components/atoms/Button'
import Dialog from '@/components/molecules/Dialog'
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
    <Dialog
      open={!!current}
      onOpenChange={() => {}}
      dismissible={false}
      title="¡Pasas a titular!"
      footer={
        <Button type="button" $size="lg" onClick={dismiss}>
          Aceptar
        </Button>
      }
    >
      <Celebration>
        <PartyPopper />
        <p>Has pasado a titular en</p>
        {current?.event_title && <strong>&quot;{current.event_title}&quot;</strong>}
        {current?.event_start_time && <p>{formatEventDate(current.event_start_time)}</p>}
      </Celebration>
    </Dialog>
  )
}

const Celebration = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0;
  text-align: center;

  svg {
    width: 3.5rem;
    height: 3.5rem;
    margin-bottom: 0.5rem;
    color: ${({ theme }) => theme.colors.forest};
  }
  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.muted};
    font-size: 0.9375rem;
  }
  strong {
    font-size: 1.0625rem;
  }
`
