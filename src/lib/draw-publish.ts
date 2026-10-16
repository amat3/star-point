import type { SupabaseClient } from '@supabase/supabase-js'
import type { MatchProposal } from '@/lib/mixing-algorithm'
import { sendPushToUsers, getTestPushAudience } from '@/lib/push'

// Court chosen for each court number of the draw (1-based), from the event's club.
export type DrawCourts = Record<number, { id: string; name: string }>

export interface PublishDrawInput {
  eventId: string
  // Who the matches are created by (the admin who published, or the event's owner for an automatic draw)
  creatorId: string
  rounds: { matches: MatchProposal[]; roundNumber: number }[]
  courts?: DrawCourts
  // Also notified besides the participants (the admin who published)
  extraRecipients?: string[]
}

/**
 * Saves the matches of a draw and moves the event to `in_progress`, then tells the players (the
 * returned `notifications` promise settles when the pushes have been sent).
 * It runs with the service client and does NO permission check: the manual flow checks the admin role
 * before calling it, and the automatic draw is a protected cron endpoint.
 *
 * Two runs at once cannot both publish: the event is claimed first (status open → in_progress in a single
 * update), and only the run that wins goes on to insert the matches.
 */
export async function publishDraw(
  admin: SupabaseClient,
  input: PublishDrawInput
): Promise<{ title: string; notifications: Promise<unknown> }> {
  const { eventId, creatorId, rounds, courts = {}, extraRecipients = [] } = input

  const { data: event } = await admin
    .from('events')
    .select('title, is_test, max_spots, status, club_id')
    .eq('id', eventId)
    .single()
  if (!event) throw new Error('Evento no encontrado')
  if (event.status !== 'open') throw new Error('Este evento ya tiene el sorteo publicado')

  const { count: participantCount } = await admin
    .from('event_participants')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
  if ((participantCount || 0) < event.max_spots) {
    throw new Error('El evento no está completo. Añade jugadores o invitados antes de generar partidos.')
  }

  // Never save a second draw on top of one with results. Leftover matches
  // without any result (e.g. from a draw that was undone) are replaced.
  const { count: playedMatches } = await admin
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .or('status.neq.pending,score_details.neq.0-0')
  if ((playedMatches ?? 0) > 0) throw new Error('Este evento ya tiene partidos con resultado')

  // Courts must belong to the event's club
  const courtIds = Object.values(courts).map(c => c.id)
  if (courtIds.length > 0) {
    const { data: valid } = await admin.from('courts').select('id').in('id', courtIds).eq('club_id', event.club_id ?? '')
    if ((valid ?? []).length !== new Set(courtIds).size) throw new Error('Alguna pista no pertenece al club del evento')
  }

  // Claim the event: only one caller gets the row back. draw_published_at remembers that it had a draw:
  // the automatic draw never acts on such an event again, not even after an admin presses "Rehacer".
  const { data: claimed } = await admin
    .from('events')
    .update({ status: 'in_progress', draw_published_at: new Date().toISOString() })
    .eq('id', eventId)
    .eq('status', 'open')
    .select('id')
  if (!claimed || claimed.length === 0) throw new Error('Este evento ya tiene el sorteo publicado')

  const revert = () => admin.from('events').update({ status: 'open', draw_published_at: null }).eq('id', eventId)

  // matches has no DELETE policy for users: this is the service client
  const { error: clearError } = await admin.from('matches').delete().eq('event_id', eventId)
  if (clearError) { await revert(); throw new Error(clearError.message) }

  const inserts = rounds.flatMap(({ matches, roundNumber }) =>
    matches.map(m => ({
      created_at: new Date().toISOString(),
      creator_id: creatorId,
      match_type: 'mixing',
      status: 'pending',
      player_a1: m.pairA[0].id,
      player_a2: m.pairA[1].id,
      player_b1: m.pairB[0].id,
      player_b2: m.pairB[1].id,
      sets_a: 0,
      sets_b: 0,
      score_details: '0-0',
      event_id: eventId,
      court_number: m.courtNumber,
      court_id: courts[m.courtNumber]?.id ?? null,
      court_name: courts[m.courtNumber]?.name ?? null,
      round_number: roundNumber,
    }))
  )

  const { error: insertError } = await admin.from('matches').insert(inserts)
  if (insertError) { await revert(); throw new Error(insertError.message) }

  let playerIds: string[]
  if (event.is_test) {
    playerIds = getTestPushAudience()
  } else {
    const { data: participants } = await admin.from('event_participants').select('user_id').eq('event_id', eventId)
    playerIds = Array.from(new Set([...(participants ?? []).map(p => p.user_id), ...extraRecipients]))
  }

  // Not awaited here, so the caller decides how: the admin screen hands it to `after` (the function stays
  // alive until it settles, without making the admin wait), and the cron endpoint awaits it before returning.
  // Never leave it floating: on a serverless platform a promise nobody waits for can be cut short.
  const notifications = sendPushToUsers(playerIds, {
    title: '¡Sorteo listo!',
    body: `Ya puedes ver tus partidos de "${event.title}"`,
    url: `/events/${eventId}`,
  }).catch(console.error)

  return { title: event.title, notifications }
}
