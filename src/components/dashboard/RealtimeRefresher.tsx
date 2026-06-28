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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, () => {
        router.refresh()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, () => {
        router.refresh()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
