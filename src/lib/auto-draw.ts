import type { SupabaseClient } from '@supabase/supabase-js'
import {
  DEFAULT_MIXING_CONFIG,
  generateEventRounds,
  summarizeRounds,
  type MixingParticipant,
  type RoundProposal,
} from '@/lib/mixing-algorithm'
import { loadMixingData } from '@/lib/mixing-data'
import { publishDraw, type DrawCourts } from '@/lib/draw-publish'
import { getTestPushAudience, sendPushToUsers } from '@/lib/push'

// The draw is made this long before the event starts, and from then on until it starts
export const DRAW_LEAD_MS = 3 * 60 * 60 * 1000
// How often the cron calls the endpoint (pg_cron): the "first window" below is one interval long
export const CRON_INTERVAL_MS = 15 * 60 * 1000
// Random draws tried before keeping the best one
export const DRAW_ATTEMPTS = 10

/** True from 3 hours before the start until the event starts. */
export function isDrawDue(startTime: string, now: number): boolean {
  const start = new Date(startTime).getTime()
  return start - DRAW_LEAD_MS <= now && now < start
}

/** True during the first cron interval after the draw became due: where the admins are told, once. */
export function isFirstDrawWindow(startTime: string, now: number): boolean {
  const start = new Date(startTime).getTime()
  return isDrawDue(startTime, now) && now - (start - DRAW_LEAD_MS) < CRON_INTERVAL_MS
}

export interface DrawQuality {
  rounds: RoundProposal[]
  reMeetings: number
  warnings: number
}

/**
 * The algorithm is random, so a few draws are tried and the best one is kept: fewest courts with a
 * warning first, then fewest repeated meetings inside the event.
 */
export function pickBestDraw(generate: () => RoundProposal[], attempts = DRAW_ATTEMPTS): DrawQuality {
  let best: DrawQuality | null = null
  for (let i = 0; i < attempts; i++) {
    const rounds = generate()
    const { reMeetings, warnings } = summarizeRounds(rounds)
    if (!best || warnings < best.warnings || (warnings === best.warnings && reMeetings < best.reMeetings)) {
      best = { rounds, reMeetings, warnings }
    }
    if (best.warnings === 0 && best.reMeetings === 0) break
  }
  return best as DrawQuality
}

export interface DueEvent {
  id: string
  title: string
  start_time: string
  max_spots: number
  club_id: string | null
  created_by: string
  is_test: boolean
}

export type AutoDrawResult =
  | { eventId: string; title: string; outcome: 'published'; reMeetings: number; warnings: number }
  | { eventId: string; title: string; outcome: 'skipped'; reason: string; notified: boolean }

async function adminAudience(admin: SupabaseClient, isTest: boolean): Promise<string[]> {
  if (isTest) return getTestPushAudience()
  const { data } = await admin.from('profiles').select('id').eq('role', 'admin')
  return (data ?? []).map(p => p.id)
}

/**
 * Makes and publishes the draw of one event, like an admin would from the generator. It never throws:
 * when something is missing (players, courts) it skips and says why, and the next run tries again.
 */
export async function runAutoDraw(admin: SupabaseClient, event: DueEvent, now: number): Promise<AutoDrawResult> {
  const base = { eventId: event.id, title: event.title }

  const skip = async (reason: string, notice: string): Promise<AutoDrawResult> => {
    // Only the first run after the mark tells the admins; the following ones retry quietly
    const notify = isFirstDrawWindow(event.start_time, now)
    if (notify) {
      // Awaited: this runs in a serverless function that ends as soon as the response is sent
      await sendPushToUsers(await adminAudience(admin, event.is_test), {
        title: 'Sorteo sin generar',
        body: `${notice} Se reintenta cada 15 minutos hasta que empiece.`,
        url: `/events/${event.id}`,
      }).catch(console.error)
    }
    return { ...base, outcome: 'skipped', reason, notified: notify }
  }

  const { count } = await admin
    .from('event_participants')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', event.id)
  const signedUp = count ?? 0
  if (signedUp < event.max_spots) {
    return skip('not_full', `"${event.title}" no está completo (${signedUp} de ${event.max_spots}).`)
  }

  // Same default as the generator screen: the first N courts of the club, by position
  const courtsNeeded = Math.floor(event.max_spots / 4)
  const courts: DrawCourts = {}
  if (event.club_id) {
    const { data: clubCourts } = await admin
      .from('courts')
      .select('id, name')
      .eq('club_id', event.club_id)
      .order('position', { ascending: true })
    if ((clubCourts ?? []).length < courtsNeeded) {
      return skip('not_enough_courts', `El club de "${event.title}" tiene ${(clubCourts ?? []).length} pistas y hacen falta ${courtsNeeded}.`)
    }
    clubCourts!.slice(0, courtsNeeded).forEach((court, index) => { courts[index + 1] = court })
  }

  let draw: DrawQuality
  try {
    const data = await loadMixingData(admin, event.id)
    draw = pickBestDraw(() =>
      generateEventRounds(
        structuredClone(data.participants) as MixingParticipant[],
        { ...DEFAULT_MIXING_CONFIG, exclusions: data.exclusions },
        data.rounds
      )
    )
  } catch (error) {
    return skip('generation_failed', `No se ha podido generar el sorteo de "${event.title}": ${error instanceof Error ? error.message : String(error)}.`)
  }

  let playersNotified: Promise<void>
  try {
    ;({ notifications: playersNotified } = await publishDraw(admin, {
      eventId: event.id,
      creatorId: event.created_by,
      rounds: draw.rounds.map((round, index) => ({ matches: round.matches, roundNumber: index + 1 })),
      courts,
    }))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // Someone (an admin, or an overlapping run) published it first: nothing to do
    if (/ya tiene el sorteo publicado/.test(message)) return { ...base, outcome: 'skipped', reason: 'already_published', notified: false }
    return skip('publish_failed', `No se ha podido publicar el sorteo de "${event.title}": ${message}.`)
  }

  const detail = draw.reMeetings === 0 && draw.warnings === 0
    ? 'Sin repeticiones.'
    : `${draw.reMeetings} reencuentros y ${draw.warnings} pistas con aviso.`
  await Promise.all([
    playersNotified,
    adminAudience(admin, event.is_test).then(audience =>
      sendPushToUsers(audience, {
        title: 'Sorteo publicado automáticamente',
        body: `"${event.title}": ${detail} Revísalo y usa Rehacer si hace falta.`,
        url: `/events/${event.id}`,
      })
    ).catch(console.error),
  ])

  return { ...base, outcome: 'published', reMeetings: draw.reMeetings, warnings: draw.warnings }
}
