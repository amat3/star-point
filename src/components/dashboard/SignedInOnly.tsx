'use client'

import dynamic from 'next/dynamic'
import type { PendingAction } from '@/app/actions/matches'

// What only a signed-in player uses: the Supabase client (realtime and notices), the result dialogs, Radix.
// The lazy imports live in a CLIENT component on purpose: declared in a server component, Next still preloads
// their chunks for everybody, and a visitor to the public home downloaded ~50 KiB of Supabase it never runs.
// Here the chunks are fetched only when the component is rendered, which the page does only with a session.
const RealtimeRefresher = dynamic(() => import('./RealtimeRefresher').then(m => m.RealtimeRefresher))
const NotificationListener = dynamic(() => import('./NotificationListener').then(m => m.NotificationListener))
const PendingActions = dynamic(() => import('@/components/molecules/PendingActions'))

export function SignedInExtras({ userId }: { userId: string }) {
  return (
    <>
      <RealtimeRefresher />
      <NotificationListener userId={userId} />
    </>
  )
}

export function SignedInPendingActions({ actions, nextRevealAt }: { actions: PendingAction[]; nextRevealAt?: string | null }) {
  return <PendingActions actions={actions} nextRevealAt={nextRevealAt} />
}
