import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminClient } from '@/utils/supabase/admin'
import { DRAW_LEAD_MS, runAutoDraw, type AutoDrawResult, type DueEvent } from '@/lib/auto-draw'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Makes the draw of each open mixing that starts in 3 hours or less. Triggered every 15 minutes by
// pg_cron (pg_net): Vercel's cron on the Hobby plan only runs once a day and with ±59 min of precision.
// Safe to call as often as wanted: an event whose draw is already published is no longer "open", and one
// that has ever had a draw (draw_published_at) is left to the admin.
// AUTO_DRAW=false switches it off without redeploying.
export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // The demo deployment shares this code but never runs it by itself
  if (process.env.NEXT_PUBLIC_DEMO === 'true') return NextResponse.json({ skipped: true, reason: 'Demo deployment' })
  if (process.env.AUTO_DRAW === 'false') return NextResponse.json({ skipped: true, reason: 'AUTO_DRAW=false' })

  const admin = getAdminClient()
  const now = Date.now()

  const { data: events, error } = await admin
    .from('events')
    .select('id, title, start_time, max_spots, club_id, created_by, is_test')
    .eq('status', 'open')
    .eq('kind', 'mixing')
    // Never drawn before: after a published draw is undone ("Rehacer") the admin takes over
    .is('draw_published_at', null)
    .gt('start_time', new Date(now).toISOString())
    .lte('start_time', new Date(now + DRAW_LEAD_MS).toISOString())
    .order('start_time', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: AutoDrawResult[] = []
  for (const event of (events ?? []) as DueEvent[]) {
    const result = await runAutoDraw(admin, event, now)
    results.push(result)
    if (result.outcome === 'published') {
      revalidatePath('/')
      revalidatePath('/mixing')
      revalidatePath(`/events/${event.id}`)
    }
  }

  return NextResponse.json({ checked: results.length, results })
}
