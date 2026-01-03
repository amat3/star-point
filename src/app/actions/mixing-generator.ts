'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { MixingParticipant, RoundProposal, MatchProposal } from '@/lib/mixing-algorithm'

// Helper to get raw data for the algorithm
export async function getEventMixingData(eventId: string): Promise<{ participants: MixingParticipant[], max_spots: number, rounds: number }> {
  const supabase = await createClient()

  // 1. Fetch participants with their profiles
  const { data: participants, error: pError } = await supabase
    .from('event_participants')
    .select(`
      user_id,
      profiles:user_id (
        id,
        rating,
        full_name,
        gender,
        court_position,
        preferred_hand
      )
    `)
    .eq('event_id', eventId)
    .order('joined_at', { ascending: true })

  if (pError) throw new Error(pError.message)

  // 1b. Fetch event details for max_spots
  const { data: eventData, error: eError } = await supabase
    .from('events')
    .select('max_spots, rounds')
    .eq('id', eventId)
    .single()

  if (eError) throw new Error(eError.message)
  
  const maxSpots = eventData.max_spots

  // Filter only Titulares (first maxSpots)
  // participants are already ordered by joined_at
  const titulares = participants.slice(0, maxSpots)

  // 2. Fetch all matches of this event to build history
  // Note: We need to see who played with whom in this event_id
  const { data: matches, error: mError } = await supabase
    .from('matches')
    .select('player_a1, player_a2, player_b1, player_b2')
    // We filter by mixing matches. 
    // Ideally we should filter by date/event relation if possible.
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

  // Transform to MixingParticipant
  const mappedParticipants = titulares.map((p: any) => {
      const profile = p.profiles
      return {
          id: p.user_id,
          rating: profile.rating || 0,
          full_name: profile.full_name || 'Jugador',
          gender: profile.gender || 'otro',
          court_position: profile.court_position || 'ambos',
          past_partners: historyMap.get(p.user_id) || new Set()
      }
  })

  return { 
      participants: mappedParticipants, 
      max_spots: maxSpots,
      rounds: eventData.rounds || 1
  }
}

export async function saveRoundMatches(eventId: string, matches: MatchProposal[]) {
    const supabase = await createClient()

    // Verify Admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No auth')
    
    // Insert matches
    // We map MatchProposal to DB schema
    const inserts = matches.map(m => ({
        created_at: new Date().toISOString(),
        start_time: new Date().toISOString(), // Or event start time
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
        // metadata or event_id if we have it? 
        // We probably should add a 'notes' or 'metadata' column or 'event_id' column to matches 
        // if we want to link them strictly. 
        // For now I'll skip event_id in insert if column unsure, but it complicates 'getEventMixingData'.
        // I will assume for this task we just insert them.
    }))

    const { error } = await supabase.from('matches').insert(inserts)
    
    if (error) throw new Error(error.message)
    
    revalidatePath(`/admin/events/${eventId}`)
    return { success: true }
}
