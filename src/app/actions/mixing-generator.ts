'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { MixingParticipant, MatchProposal, ExclusionRule } from '@/lib/mixing-algorithm'
import { sendPushToUsers, TEST_PUSH_AUDIENCE } from '@/lib/push'

// 🆕 Ventana de historial: cuántos eventos recientes (incluyendo el actual,
// si ya tiene rondas guardadas) se usan para calcular el historial de
// rotación. Evento actual + el inmediatamente anterior.
const HISTORY_WINDOW_EVENTS = 2

export async function getEventMixingData(eventId: string): Promise<{ participants: MixingParticipant[], max_spots: number, rounds: number, exclusions: ExclusionRule[] }> {
  const supabase = await createClient()

  const { data: participants, error: pError } = await supabase
    .from('event_participants')
    .select('user_id, joined_at')
    .eq('event_id', eventId)
    .order('joined_at', { ascending: true })

  if (pError) throw new Error(pError.message)

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

  const combinedParticipants = participants.map((p) => ({
      user_id: p.user_id,
      profiles: profilesMap[p.user_id] || {}
  }))

  const { data: eventData, error: eError } = await supabase
    .from('events')
    .select('max_spots, rounds')
    .eq('id', eventId)
    .single()

  if (eError) throw new Error(eError.message)

  const maxSpots = eventData.max_spots
  const titulares = combinedParticipants.slice(0, maxSpots)

  // 🆕 Ventana de rotación: los últimos HISTORY_WINDOW_EVENTS eventos por
  // fecha de celebración (start_time). Excluimos los eventos de prueba
  // (is_test) para que no contaminen la rotación real. Incluye el actual
  // si ya está entre los más recientes, que es lo habitual.
  const { data: recentEvents, error: reError } = await supabase
    .from('events')
    .select('id')
    .eq('is_test', false)
    .order('start_time', { ascending: false })
    .limit(HISTORY_WINDOW_EVENTS)

  if (reError) throw new Error(reError.message)

  const windowEventIds = new Set((recentEvents ?? []).map(e => e.id))
  windowEventIds.add(eventId) // por si acaso el evento actual no apareciera aún en la lista

  const { data: matches } = await supabase
    .from('matches')
    .select('event_id, player_a1, player_a2, player_b1, player_b2')
    .eq('match_type', 'mixing')
    .in('status', ['pending', 'confirmed'])
    .in('event_id', Array.from(windowEventIds))

  const priorEncounterCountsMap = new Map<string, Map<string, number>>()   // 🆕 solo evento(s) anterior(es) de la ventana
  const sessionEncounterCountsMap = new Map<string, Map<string, number>>() // 🆕 solo el evento ACTUAL (rondas ya guardadas)
  const priorPartnerMap = new Map<string, Set<string>>()   // parejas del evento anterior (coste blando)
  const sessionPartnerMap = new Map<string, Set<string>>() // parejas de ESTE evento (bloqueo duro)
  titulares.forEach((p) => {
    priorEncounterCountsMap.set(p.user_id, new Map())
    sessionEncounterCountsMap.set(p.user_id, new Map())
    priorPartnerMap.set(p.user_id, new Set())
    sessionPartnerMap.set(p.user_id, new Set())
  })

  const bump = (map: Map<string, Map<string, number>>, x: string | null, y: string | null) => {
    if (!x || !y) return
    const m = map.get(x)
    if (m) m.set(y, (m.get(y) || 0) + 1)
  }
  const markPartner = (map: Map<string, Set<string>>, x: string | null, y: string | null) => {
    if (!x || !y) return
    map.get(x)?.add(y)
  }

  if (matches) {
      matches.forEach((m) => {
          // 🆕 separamos según si el partido pertenece al evento ACTUAL
          // (session, pesa muchísimo más) o a otro evento de la ventana
          // (prior, el anterior — se tolera antes que repetir en el actual).
          const targetMap = m.event_id === eventId ? sessionEncounterCountsMap : priorEncounterCountsMap
          const ids = [m.player_a1, m.player_a2, m.player_b1, m.player_b2]
          for (let i = 0; i < ids.length; i++) {
              for (let j = i + 1; j < ids.length; j++) {
                  bump(targetMap, ids[i], ids[j])
                  bump(targetMap, ids[j], ids[i])
              }
          }
          // Las parejas reales (no los cruces rivales) se registran aparte:
          // las de este evento bloquean (duro), las del anterior solo penalizan.
          const partnerMap = m.event_id === eventId ? sessionPartnerMap : priorPartnerMap
          markPartner(partnerMap, m.player_a1, m.player_a2)
          markPartner(partnerMap, m.player_a2, m.player_a1)
          markPartner(partnerMap, m.player_b1, m.player_b2)
          markPartner(partnerMap, m.player_b2, m.player_b1)
      })
  }

  const mappedParticipants = titulares.map((p) => {
      const profile = p.profiles
      return {
          id: p.user_id,
          rating: profile.rating || 0,
          full_name: profile.full_name || 'Jugador',
          gender: profile.gender || 'otro',
          court_position: profile.court_position || 'ambos',
          avatar_url: profile.avatar_url ?? null,
          encounter_counts: Object.fromEntries(priorEncounterCountsMap.get(p.user_id) || []), // 🆕 solo evento anterior
          session_encounter_counts: Object.fromEntries(sessionEncounterCountsMap.get(p.user_id) || []), // 🆕 solo evento actual
          partner_history: Array.from(priorPartnerMap.get(p.user_id) || []), // pareja en el evento anterior (blando)
          session_partner_history: Array.from(sessionPartnerMap.get(p.user_id) || []), // pareja en este evento (bloqueo duro)
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

    await supabase.from('events').update({ status: 'in_progress' }).eq('id', eventId)

    revalidatePath(`/admin/events/${eventId}`)
    return { success: true }
}