'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { MixingParticipant, RoundProposal, MatchProposal } from '@/lib/mixing-algorithm'

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
  const userIds = participants.map((p: any) => p.user_id)
  let profilesMap: Record<string, any> = {}

  if (userIds.length > 0) {
      const { data: profiles } = await supabase
          .from('profiles')
          .select('id, rating, full_name, gender, court_position, preferred_hand')
          .in('id', userIds)
      
      profiles?.forEach((p: any) => {
          profilesMap[p.id] = p
      })
  }

  // Combine data
  const combinedParticipants = participants.map((p: any) => ({
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
  const { data: matches, error: mError } = await supabase
    .from('matches')
    .select('player_a1, player_a2, player_b1, player_b2')
    .eq('event_id', eventId)
    .eq('match_type', 'mixing') 
  
  const historyMap = new Map<string, Set<string>>()
  
  titulares.forEach((p: any) => {
      historyMap.set(p.user_id, new Set())
  })

  // Build history (who played with whom as PARTNER)
  if (matches) {
      matches.forEach((m: any) => {
          // Pair A
          if (m.player_a1 && m.player_a2) {
              historyMap.get(m.player_a1)?.add(m.player_a2)
              historyMap.get(m.player_a2)?.add(m.player_a1)
          }
          // Pair B
          if (m.player_b1 && m.player_b2) {
              historyMap.get(m.player_b1)?.add(m.player_b2)
              historyMap.get(m.player_b2)?.add(m.player_b1)
          }
      })
  }

  // Transform to serializable object (Set -> Array)
  const mappedParticipants = titulares.map((p: any) => {
      const profile = p.profiles
      return {
          id: p.user_id,
          rating: profile.rating || 0,
          full_name: profile.full_name || 'Jugador',
          gender: profile.gender || 'otro',
          court_position: profile.court_position || 'ambos',
          past_partners: Array.from(historyMap.get(p.user_id) || [])
      }
  })

  return { 
      participants: mappedParticipants as any, // Cast to any to avoid type mismatch with Set vs Array
      max_spots: maxSpots,
      rounds: eventData.rounds || 1
  }
}

export async function saveRoundMatches(eventId: string, matches: MatchProposal[], roundNumber: number = 1) {
    const supabase = await createClient()

    // Verify Admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No auth')
    
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
        round_number: roundNumber
    }))

    const { error } = await supabase.from('matches').insert(inserts)
    
    if (error) throw new Error(error.message)
    
    // Update event status to 'in_progress' so it disappears from the "Open Events" dashboard list
    await supabase.from('events').update({ status: 'in_progress' }).eq('id', eventId)
    
    revalidatePath(`/admin/events/${eventId}`)
    return { success: true }
}
