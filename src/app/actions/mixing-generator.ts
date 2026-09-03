'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { MixingParticipant, MatchProposal, ExclusionRule } from '@/lib/mixing-algorithm'
import { sendPushToUsers, TEST_PUSH_AUDIENCE } from '@/lib/push'

// Helper to get raw data for the algorithm
export async function getEventMixingData(eventId: string): Promise<{ participants: MixingParticipant[], max_spots: number, rounds: number, exclusions: ExclusionRule[] }> {
  const supabase = await createClient()

  // 1. Fetch participants (just IDs and join time)
  const { data: participants, error: pError } = await supabase
    .from('event_participants')
    .select('user_id, joined_at')
    .eq('event_id', eventId)
    .order('joined_at', { ascending: true })

  if (pError) throw new Error(pError.message)

  // 1b. Fetch profiles for these users manually
  type MixingProfile = { id: string; rating?: number; full_name?: string; gender?: string; court_position?: string; preferred_hand?: string; is_guest?: boolean; avatar_url?: string | null }
  const userIds = participants.map((p) => p.user_id)
  const profilesMap: Record<string, MixingProfile> = {}

  if (userIds.length > 0) {
      const { data: profiles } = await supabase
          .from('profiles')
          .select('id, rating, full_name, gender, court_position, preferred_hand, is_guest, avatar_url')
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

  // 2. Fetch matches to build history. Deliberadamente SIN filtrar por
  // event_id: el historial de pareja/rival abarca todo el club (ver
  // fde67a62) para evitar repetir pareja de una semana a otra como
  // preferencia soft. Además, distinguimos aparte qué de ese historial
  // pertenece a ESTE evento (currentEventHistoryMap / currentEventEncounterCountsMap),
  // que se trata como restricción DURA en el algoritmo:
  //   - Pareja repetida dentro del mismo evento -> nunca puede pasar.
  //   - Dos jugadores que ya coincidieron 2 veces en total dentro del mismo
  //     evento (sumando pareja Y rival, sea la combinación que sea) -> no
  //     pueden volver a coincidir de ninguna forma (ver mixing-algorithm.ts,
  //     MAX_TOTAL_ENCOUNTERS).
  // El histórico entre eventos distintos (past_partners/past_opponents)
  // sigue siendo solo una preferencia soft (penaliza, no bloquea).
  const { data: matches } = await supabase
    .from('matches')
    .select('event_id, player_a1, player_a2, player_b1, player_b2')
    .eq('match_type', 'mixing')
    .in('status', ['pending', 'confirmed'])

  const historyMap = new Map<string, Set<string>>()
  const opponentsMap = new Map<string, Set<string>>()
  const currentEventHistoryMap = new Map<string, Set<string>>()
  const currentEventEncounterCountsMap = new Map<string, Map<string, number>>() // 🆕 hard constraint combinado: pareja + rival, solo este evento

  titulares.forEach((p) => {
      historyMap.set(p.user_id, new Set())
      opponentsMap.set(p.user_id, new Set())
      currentEventHistoryMap.set(p.user_id, new Set())
      currentEventEncounterCountsMap.set(p.user_id, new Map()) // 🆕
  })

  // Build history (who played with whom as PARTNER and OPPONENT)
  if (matches) {
      matches.forEach((m) => {
          const a1 = m.player_a1
          const a2 = m.player_a2
          const b1 = m.player_b1
          const b2 = m.player_b2
          const isCurrentEvent = m.event_id === eventId

          // 🆕 helper: suma 1 al cupo combinado de encuentros, en ambos sentidos,
          // SOLO si el partido pertenece a este evento
          const bumpEncounter = (x: string | null, y: string | null) => {
              if (!isCurrentEvent || !x || !y) return
              const mx = currentEventEncounterCountsMap.get(x)
              if (mx) mx.set(y, (mx.get(y) || 0) + 1)
              const my = currentEventEncounterCountsMap.get(y)
              if (my) my.set(x, (my.get(x) || 0) + 1)
          }

          // Pair A Partners
          if (a1 && a2) {
              historyMap.get(a1)?.add(a2)
              historyMap.get(a2)?.add(a1)
              if (isCurrentEvent) {
                  currentEventHistoryMap.get(a1)?.add(a2)
                  currentEventHistoryMap.get(a2)?.add(a1)
              }
              bumpEncounter(a1, a2) // 🆕 pareja también cuenta para el cupo combinado
          }
          // Pair B Partners
          if (b1 && b2) {
              historyMap.get(b1)?.add(b2)
              historyMap.get(b2)?.add(b1)
              if (isCurrentEvent) {
                  currentEventHistoryMap.get(b1)?.add(b2)
                  currentEventHistoryMap.get(b2)?.add(b1)
              }
              bumpEncounter(b1, b2) // 🆕
          }

          // Opponents (A vs B) — histórico de club (soft, todo Set sí/no)
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

          // 🆕 Rival también cuenta para el mismo cupo combinado
          bumpEncounter(a1, b1)
          bumpEncounter(a1, b2)
          bumpEncounter(a2, b1)
          bumpEncounter(a2, b2)
      })
  }

  // Transform to serializable object (Set -> Array, Map -> Record)
  const mappedParticipants = titulares.map((p) => {
      const profile = p.profiles
      const countsMap = currentEventEncounterCountsMap.get(p.user_id) || new Map<string, number>()
      return {
          id: p.user_id,
          rating: profile.rating || 0,
          full_name: profile.full_name || 'Jugador',
          gender: profile.gender || 'otro',
          court_position: profile.court_position || 'ambos',
          avatar_url: profile.avatar_url ?? null,
          past_partners: Array.from(historyMap.get(p.user_id) || []),
          past_opponents: Array.from(opponentsMap.get(p.user_id) || []),
          encounter_counts: Object.fromEntries(countsMap), // 🆕 hard constraint combinado, solo evento actual
          current_event_partners: Array.from(currentEventHistoryMap.get(p.user_id) || []),
          is_guest: profile.is_guest ?? false
      }
  })

  const { data: exclusionsData } = await supabase
    .from('mixing_exclusions')
    .select('player_a, player_b, type')

  const exclusions: ExclusionRule[] = (exclusionsData ?? []).map((row: { player_a: string; player_b: string; type: 'no_partner' | 'no_opponent' | 'no_contact' }) => ({
    playerA: row.player_a,
    playerB: row.player_b,
    type: row.type,
  }))

  return {
      participants: mappedParticipants as MixingParticipant[],
      max_spots: maxSpots,
      rounds: eventData.rounds || 1,
      exclusions,
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

  // Defensa en profundidad: el evento debe estar completo antes de generar
  // partidos, aunque el cliente ya bloquea el botón en este mismo caso.
  const { data: eventCheck } = await supabase.from('events').select('max_spots').eq('id', eventId).single()
  if (eventCheck) {
    const { count: participantCount } = await supabase
      .from('event_participants')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
    if ((participantCount || 0) < eventCheck.max_spots) {
      throw new Error('El evento no está completo. Añade jugadores o invitados antes de generar partidos.')
    }
  }

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

  const { data: event } = await supabase
    .from('events')
    .update({ status: 'in_progress' })
    .eq('id', eventId)
    .select('title, is_test')
    .single()

  if (event) {
    let playerIds: string[]
    if (event.is_test) {
      playerIds = TEST_PUSH_AUDIENCE
    } else {
      const { data: participants } = await supabase
        .from('event_participants')
        .select('user_id')
        .eq('event_id', eventId)

      playerIds = Array.from(new Set([
        ...(participants ?? []).map(p => p.user_id),
        user.id,
      ]))
    }

    sendPushToUsers(playerIds, {
      title: '¡Partidos listos!',
      body: `Ya puedes ver tus partidos de "${event.title}"`,
      url: '/dashboard',
    }).catch(console.error)
  }

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
