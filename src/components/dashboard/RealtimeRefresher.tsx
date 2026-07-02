'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export function RealtimeRefresher() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_participants' }, () => {
        router.refresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        router.refresh()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, () => {
        router.refresh()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, () => {
        router.refresh()
      })
      .subscribe()

    // El socket de Realtime se autentica una sola vez al conectar. Si el JWT
    // se renueva en segundo plano (expira a la hora) el socket sigue usando
    // el token viejo y el servidor puede cerrarlo sin avisar. Reenviamos el
    // token nuevo al socket cada vez que supabase-js lo renueva.
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && session) {
        supabase.realtime.setAuth(session.access_token)
      }
    })

    // Las pestañas en segundo plano o un portátil suspendido pueden matar el
    // WebSocket sin que el cliente lo note. Al recuperar el foco, forzamos un
    // refresh de los datos y comprobamos si el canal sigue vivo.
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return
      router.refresh()
      if (channel.state !== 'joined') {
        channel.subscribe()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleVisibility)

    return () => {
      authListener.subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleVisibility)
      supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
