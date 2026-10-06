'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface TimeRefresherProps {
  // Moments (ISO) at which something on the page changes by itself: a partido ends,
  // a published draw reaches its start time
  times: string[]
}

// Refreshes the page right after the next of those moments. One timer, one refresh per
// moment: it costs nothing while nothing is about to change.
const MARGIN_MS = 1000
const MIN_DELAY_MS = 5000
// Long timers are unreliable (and phones freeze them): re-arm at least this often
const MAX_DELAY_MS = 30 * 60 * 1000

export function TimeRefresher({ times }: TimeRefresherProps) {
  const router = useRouter()
  const key = times.join('|')

  useEffect(() => {
    const now = Date.now()
    const upcoming = key
      .split('|')
      .filter(Boolean)
      .map(t => new Date(t).getTime())
      .filter(t => !isNaN(t) && t + MARGIN_MS > now)
    if (upcoming.length === 0) return

    const next = Math.min(...upcoming)
    const delay = Math.min(Math.max(next + MARGIN_MS - now, MIN_DELAY_MS), MAX_DELAY_MS)
    // Once the moment has passed the server renders without it, so the timer is not re-armed
    const timer = setTimeout(() => router.refresh(), delay)
    return () => clearTimeout(timer)
  }, [key, router])

  return null
}
