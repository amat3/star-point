'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { MatchProposal } from '@/lib/mixing-algorithm'
import { loadMixingData, type MixingData } from '@/lib/mixing-data'
import { getAdminClient } from '@/utils/supabase/admin'
import { publishDraw, type DrawCourts } from '@/lib/draw-publish'
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
