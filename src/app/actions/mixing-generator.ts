'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { MixingParticipant, MatchProposal } from '@/lib/mixing-algorithm'

// Helper to get raw data for the algorithm
export async function getEventMixingData(eventId: string): Promise<{ participants: MixingParticipant[], max_spots: number, rounds: number }> {
  const supabase = await createClient()

  // 1. Fetch participants (just IDs and join time)
  const { data: participants, error: pError } = await supabase
    .from('event_participants')
    .select('user_id, joined_at')
    .eq('event_id', eventId)
    .order('joined_at', { ascending: true })

  if (pError) throw new Error(pError.message)

  // 1b. Fetch profiles for these users manually
  type MixingProfile = { id: string; rating?: number; full_name?: string; gender?: string; court_position?: string; preferred_hand?: string; is_guest?: boolean }
  const userIds = participants.map((p) => p.user_id)
  const profilesMap: Record<string, MixingProfile> = {}

  if (userIds.length > 0) {
      const { data: profiles } = await supabase
          .from('profiles')
          .select('id, rating, full_name, gender, court_position, preferred_hand, is_guest')
          .in('id', userIds)

      profiles?.forEach((p) => {
          profilesMap[p.id] = p
      })
  }

  // Combine data
  const combinedParticipants = participants.map((p) => ({
      user_id: p.user_id,
      profiles: profilesMap[p.user_id] || {}
  }))

  // 1b. Fetch event details for max_spots
  const { data: eventData, error: eError } = await supabase
    .from('events')
    .select('max_spots, rounds')
    .eq('id', eventId)
    .single()

  if (eError) throw new Error(eError.message)
  
  const maxSpots = eventData.max_spots

  // Filter only Titulares (first maxSpots)
  const titulares = combinedParticipants.slice(0, maxSpots)

  // 2. Fetch all matches of this event to build history
  // Now we can filter strictly by event_id to see previous rounds of THIS event
  const { data: matches } = await supabase
    .from('matches')
    .select('player_a1, player_a2, player_b1, player_b2')
    .eq('event_id', eventId)
    .eq('match_type', 'mixing')
    .in('status', ['pending', 'confirmed'])
  
  const historyMap = new Map<string, Set<string>>()
  const opponentsMap = new Map<string, Set<string>>()
  
  titulares.forEach((p) => {
      historyMap.set(p.user_id, new Set())
      opponentsMap.set(p.user_id, new Set())
  })

  // Build history (who played with whom as PARTNER and OPPONENT)
  if (matches) {
      matches.forEach((m) => {
          const a1 = m.player_a1
          const a2 = m.player_a2
          const b1 = m.player_b1
          const b2 = m.player_b2

          // Pair A Partners
          if (a1 && a2) {
              historyMap.get(a1)?.add(a2)
              historyMap.get(a2)?.add(a1)
          }
          // Pair B Partners
          if (b1 && b2) {
              historyMap.get(b1)?.add(b2)
              historyMap.get(b2)?.add(b1)
          }

          // Opponents (A vs B)
          // A1 vs B1/B2
          if (a1) {
              if (b1) { opponentsMap.get(a1)?.add(b1); opponentsMap.get(b1)?.add(a1); }
              if (b2) { opponentsMap.get(a1)?.add(b2); opponentsMap.get(b2)?.add(a1); }
          }
          // A2 vs B1/B2
          if (a2) {
              if (b1) { opponentsMap.get(a2)?.add(b1); opponentsMap.get(b1)?.add(a2); }
              if (b2) { opponentsMap.get(a2)?.add(b2); opponentsMap.get(b2)?.add(a2); }
          }
      })
  }

  // Transform to serializable object (Set -> Array)
  const mappedParticipants = titulares.map((p) => {
      const profile = p.profiles
      return {
          id: p.user_id,
          rating: profile.rating || 0,
          full_name: profile.full_name || 'Jugador',
          gender: profile.gender || 'otro',
          court_position: profile.court_position || 'ambos',
          past_partners: Array.from(historyMap.get(p.user_id) || []),
          past_opponents: Array.from(opponentsMap.get(p.user_id) || []),
          is_guest: profile.is_guest ?? false
      }
  })

  return { 
      participants: mappedParticipants as MixingParticipant[],
      max_spots: maxSpots,
      rounds: eventData.rounds || 1
  }
}

export async function saveAllRounds(
  eventId: string,
  rounds: { matches: MatchProposal[], roundNumber: number }[],
  courtNames: Record<number, string> = {}
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No auth')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Solo los administradores pueden guardar rondas')

  const inserts = rounds.flatMap(({ matches, roundNumber }) =>
    matches.map(m => ({
      created_at: new Date().toISOString(),
      creator_id: user.id,
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
      court_name: courtNames[m.courtNumber] || null,
      round_number: roundNumber
    }))
  )

  const { error } = await supabase.from('matches').insert(inserts)
  if (error) throw new Error(error.message)

  await supabase.from('events').update({ status: 'in_progress' }).eq('id', eventId)

  revalidatePath(`/admin/events/${eventId}`)
  return { success: true }
}

export async function saveRoundMatches(eventId: string, matches: MatchProposal[], roundNumber: number = 1, courtNames: Record<number, string> = {}) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No auth')

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') throw new Error('Solo los administradores pueden guardar rondas')
    
    // Insert matches
    // We map MatchProposal to DB schema
    const inserts = matches.map(m => ({
        created_at: new Date().toISOString(),
        creator_id: user.id,
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
        court_name: courtNames[m.courtNumber] || null,
        round_number: roundNumber
    }))

    const { error } = await supabase.from('matches').insert(inserts)
    
    if (error) throw new Error(error.message)
    
    // Update event status to 'in_progress' so it disappears from the "Open Events" dashboard list
    await supabase.from('events').update({ status: 'in_progress' }).eq('id', eventId)
    
    revalidatePath(`/admin/events/${eventId}`)
    return { success: true }
}
