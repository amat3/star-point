import { NextResponse } from 'next/server'
import { getAdminClient } from '@/utils/supabase/admin'
import { applyMatchConfirmation, type ConfirmableMatch } from '@/lib/confirm-match'

const WINDOW_MS = 24 * 60 * 60 * 1000

type PendingRow = ConfirmableMatch & {
  created_at: string
  events: { is_test: boolean; start_time: string; duration_minutes: number | null } | null
}

// Closes pending matches 24 h after the last change to their score:
//  - with a score: confirmed automatically (silence = agreement), ratings updated
//  - without a score (0-0): expired, ratings untouched
// Disputed matches are left for an admin. Triggered hourly by pg_cron (pg_net).
export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getAdminClient()
  const now = Date.now()
  const cutoff = new Date(now - WINDOW_MS).toISOString()

  // 1. Scored matches nobody confirmed. Oldest first so ratings chain in play order.
  const { data: scored, error: scoredError } = await supabase
    .from('matches')
    .select('id, event_id, score_details, player_a1, player_a2, player_b1, player_b2, created_at, events(is_test, start_time, duration_minutes)')
    .eq('status', 'pending')
    .neq('score_details', '0-0')
    .lt('result_updated_at', cutoff)
    .order('created_at', { ascending: true })
    .order('round_number', { ascending: true })

  if (scoredError) {
    return NextResponse.json({ error: scoredError.message }, { status: 500 })
  }

  const confirmed: string[] = []
  const failed: { id: string; error: string }[] = []

  for (const row of (scored ?? []) as unknown as PendingRow[]) {
    const result = await applyMatchConfirmation(supabase, row)
    if (result.success) confirmed.push(row.id)
    else failed.push({ id: row.id, error: result.error ?? 'unknown' })
  }

  // 2. Matches that never got a score: expire 24 h after the event ended.
  const { data: unscored, error: unscoredError } = await supabase
    .from('matches')
    .select('id, created_at, events(start_time, duration_minutes)')
    .eq('status', 'pending')
    .eq('score_details', '0-0')

  if (unscoredError) {
    return NextResponse.json({ error: unscoredError.message, confirmed, failed }, { status: 500 })
  }

  const expiredIds = ((unscored ?? []) as unknown as {
    id: string
    created_at: string
    events: { start_time: string; duration_minutes: number | null } | null
  }[])
    .filter(m => {
      const endedAt = m.events
        ? new Date(m.events.start_time).getTime() + (m.events.duration_minutes ?? 90) * 60_000
        : new Date(m.created_at).getTime()
      return endedAt + WINDOW_MS < now
    })
    .map(m => m.id)

  if (expiredIds.length > 0) {
    const { error } = await supabase
      .from('matches')
      .update({ status: 'expired' })
      .in('id', expiredIds)
      .eq('status', 'pending')
      .eq('score_details', '0-0')
    if (error) {
      return NextResponse.json({ error: error.message, confirmed, failed }, { status: 500 })
    }
  }

  return NextResponse.json({ confirmed: confirmed.length, expired: expiredIds.length, failed })
}
