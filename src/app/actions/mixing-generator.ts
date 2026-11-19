'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { MatchProposal } from '@/lib/mixing-algorithm'
import { loadMixingData, type MixingData } from '@/lib/mixing-data'
import { getAdminClient } from '@/utils/supabase/admin'
import { publishDraw, type DrawCourts } from '@/lib/draw-publish'
import type { DrawRule } from '@/lib/draw-rules'
import { after } from 'next/server'

export async function getEventMixingData(eventId: string): Promise<MixingData> {
  const supabase = await createClient()

  // Ratings and the whole draw input: admins only
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No auth')
  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (callerProfile?.role !== 'admin') throw new Error('Requiere admin')

  return loadMixingData(supabase, eventId)
}

export async function saveAllRounds(
  eventId: string,
  rounds: { matches: MatchProposal[], roundNumber: number }[],
  courts: DrawCourts = {}
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No auth')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Solo los administradores pueden guardar rondas')

  // Same publication as the automatic draw (src/lib/draw-publish.ts); the admin is also told
  const { notifications } = await publishDraw(getAdminClient(), { eventId, creatorId: user.id, rounds, courts, extraRecipients: [user.id] })
  // The admin screen does not wait for the push service, but the function must stay alive until it finishes
  after(() => notifications)

  revalidatePath('/')
  revalidatePath('/mixing')
  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

// Rotates the pairs of a published match through its 3 possible pairings
// (a1+a2 | b1+b2 → a1+b1 | b2+a2 → a1+b2 | a2+b1 → back), for when the four
// players agree to change partners on the court. Only before a result exists.
export async function rotateMatchPairs(matchId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No auth')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Requiere admin')

  const { data: match } = await supabase
    .from('matches')
    .select('event_id, status, score_details, player_a1, player_a2, player_b1, player_b2')
    .eq('id', matchId)
    .single()
  if (!match) throw new Error('Partido no encontrado')
  if (match.event_id) {
    const { data: event } = await supabase.from('events').select('draw_locked').eq('id', match.event_id).single()
    if (event?.draw_locked) throw new Error('El sorteo de este evento está bloqueado: no se pueden cambiar las parejas')
  }
  if (match.status !== 'pending' || (match.score_details ?? '0-0') !== '0-0') {
    throw new Error('Este partido ya tiene resultado: no se pueden cambiar las parejas')
  }

  const { player_a1: a1, player_a2: a2, player_b1: b1, player_b2: b2 } = match
  const { error } = await supabase
    .from('matches')
    .update({ player_a1: a1, player_a2: b1, player_b1: b2, player_b2: a2 })
    .eq('id', matchId)
  if (error) throw new Error(error.message)

  if (match.event_id) revalidatePath(`/events/${match.event_id}`)
  return { success: true }
}

// --- Rules of an event's draw (event_draw_rules): admins only ---------------------------------------------------

async function requireAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No auth')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Requiere admin')
  return { supabase, userId: user.id }
}

const RULE_COLUMNS = 'id, kind, player_a, player_b, a:player_a(full_name), b:player_b(full_name)'

type Named = { full_name: string | null } | { full_name: string | null }[] | null
type RuleRow = { id: string; kind: 'pair' | 'women_court'; player_a: string; player_b: string | null; a: Named; b: Named }

const nameOf = (profile: Named) => (Array.isArray(profile) ? profile[0]?.full_name : profile?.full_name) ?? 'Jugador'

function toDrawRule(row: RuleRow): DrawRule {
  return {
    id: row.id,
    kind: row.kind,
    playerA: row.player_a,
    playerB: row.player_b,
    playerAName: nameOf(row.a),
    playerBName: row.player_b ? nameOf(row.b) : null,
  }
}

export async function getDrawRules(eventId: string): Promise<DrawRule[]> {
  const { supabase } = await requireAdminUser()
  const { data, error } = await supabase.from('event_draw_rules').select(RULE_COLUMNS).eq('event_id', eventId).order('created_at')
  if (error) {
    // Before its migration the table does not exist, and then there are no rules either
    if (error.code === '42P01' || error.code === 'PGRST205') return []
    throw new Error(error.message)
  }
  return ((data ?? []) as unknown as RuleRow[]).map(toDrawRule)
}

export async function addDrawRule(eventId: string, kind: 'pair' | 'women_court', playerA: string, playerB: string | null): Promise<DrawRule> {
  const { userId } = await requireAdminUser()
  if (kind === 'pair' ? !playerB || playerB === playerA : playerB !== null) throw new Error('Regla no válida')

  const admin = getAdminClient()
  const { data: event } = await admin.from('events').select('kind, status').eq('id', eventId).single()
  if (!event || event.kind !== 'mixing' || event.status !== 'open') throw new Error('Las reglas solo se cambian antes de publicar el sorteo')

  const players = playerB ? [playerA, playerB] : [playerA]
  const { count } = await admin
    .from('event_participants')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .in('user_id', players)
  if ((count ?? 0) !== players.length) throw new Error('Los jugadores de una regla tienen que estar apuntados al evento')

  const { data, error } = await admin
    .from('event_draw_rules')
    .insert({ event_id: eventId, kind, player_a: playerA, player_b: playerB, created_by: userId })
    .select(RULE_COLUMNS)
    .single()
  if (error) throw new Error(error.code === '23505' ? 'Esa regla ya está puesta' : error.message)
  return toDrawRule(data as unknown as RuleRow)
}

export async function removeDrawRule(ruleId: string) {
  await requireAdminUser()
  const { error } = await getAdminClient().from('event_draw_rules').delete().eq('id', ruleId)
  if (error) throw new Error(error.message)
  return { success: true }
}
