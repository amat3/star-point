import type { SupabaseClient } from '@supabase/supabase-js'
import { formatEventChip } from '@/lib/utils'
import { toCourtPlayer, type DrawProfile } from '@/lib/event-draw'
import type { CourtPlayer } from '@/components/molecules/CourtCard'

export interface AdminMatch {
  id: string
  eventId: string | null
  round: number
  courtNumber: number | null
  title: string
  status: 'pending' | 'disputed'
  // Raw team A vs team B totals; null while there is no result
  games: { a: number; b: number } | null
  teamA: CourtPlayer[]
  teamB: CourtPlayer[]
  // Raw data for the score dialog
  dialogMatch: {
    id: string
    score_details: string
    p_a1: { full_name: string | null } | null
    p_a2: { full_name: string | null } | null
    p_b1: { full_name: string | null } | null
    p_b2: { full_name: string | null } | null
  }
}

export interface AdminEventGroup {
  // null: matches that do not belong to an event
  eventId: string | null
  title: string
  subtitle: string | null
  courts: { id: string; name: string }[]
  rounds: { number: number; matches: AdminMatch[] }[]
}

type Row = {
  id: string
  event_id: string | null
  round_number: number | null
  court_number: number | null
  court_name: string | null
  score_details: string | null
  status: 'pending' | 'disputed'
  player_a1: string
  player_a2: string
  player_b1: string
  player_b2: string
  p_a1: DrawProfile
  p_a2: DrawProfile
  p_b1: DrawProfile
  p_b2: DrawProfile
  court: { name: string } | { name: string }[] | null
  event: {
    title: string
    start_time: string
    club_id: string | null
    club: { name: string } | { name: string }[] | null
  } | null
}

const one = <T,>(value: T | T[] | null | undefined): T | null =>
  (Array.isArray(value) ? value[0] : value) ?? null

/** Every pending or disputed match, grouped by event and round (admin view, with levels). */
export async function getAdminPendingMatches(supabase: SupabaseClient): Promise<AdminEventGroup[]> {
  const fields = 'full_name, avatar_url, court_position, rating'

  const { data } = await supabase
    .from('matches')
    .select(`
      id, event_id, round_number, court_number, court_name, score_details, status,
      player_a1, player_a2, player_b1, player_b2,
      p_a1:profiles!player_a1(${fields}),
      p_a2:profiles!player_a2(${fields}),
      p_b1:profiles!player_b1(${fields}),
      p_b2:profiles!player_b2(${fields}),
      court:courts(name),
      event:events(title, start_time, club_id, club:clubs(name))
    `)
    .in('status', ['pending', 'disputed'])
    .order('round_number', { ascending: true })
    .order('court_number', { ascending: true })

  const rows = (data ?? []) as unknown as Row[]

  // Courts of every club involved, in their display order
  const clubIds = [...new Set(rows.map(r => r.event?.club_id).filter((id): id is string => !!id))]
  const courtsByClub = new Map<string, { id: string; name: string }[]>()
  if (clubIds.length > 0) {
    const { data: courts } = await supabase
      .from('courts')
      .select('id, name, club_id')
      .in('club_id', clubIds)
      .order('position', { ascending: true })
    for (const c of courts ?? []) {
      courtsByClub.set(c.club_id, [...(courtsByClub.get(c.club_id) ?? []), { id: c.id, name: c.name }])
    }
  }

  const groups = new Map<string, AdminEventGroup & { startsAt: string }>()

  for (const row of rows) {
    const key = row.event_id ?? 'none'
    if (!groups.has(key)) {
      const club = one(row.event?.club)
      groups.set(key, {
        eventId: row.event_id,
        title: row.event?.title?.trim() ?? 'Partidos sueltos',
        subtitle: row.event ? [formatEventChip(row.event.start_time), club?.name].filter(Boolean).join(' · ') : null,
        courts: row.event?.club_id ? courtsByClub.get(row.event.club_id) ?? [] : [],
        rounds: [],
        startsAt: row.event?.start_time ?? '',
      })
    }
    const group = groups.get(key)!

    const raw = row.score_details ?? '0-0'
    const [a, b] = raw.split('-').map(Number)
    const court = one(row.court)

    const match: AdminMatch = {
      id: row.id,
      eventId: row.event_id,
      round: row.round_number ?? 1,
      courtNumber: row.court_number,
      title: court?.name ?? row.court_name ?? (row.court_number ? `Pista ${row.court_number}` : 'Pista por asignar'),
      status: row.status,
      games: raw !== '0-0' && !isNaN(a) && !isNaN(b) ? { a, b } : null,
      teamA: [toCourtPlayer(row.player_a1, row.p_a1, true), toCourtPlayer(row.player_a2, row.p_a2, true)],
      teamB: [toCourtPlayer(row.player_b1, row.p_b1, true), toCourtPlayer(row.player_b2, row.p_b2, true)],
      dialogMatch: { id: row.id, score_details: raw, p_a1: row.p_a1, p_a2: row.p_a2, p_b1: row.p_b1, p_b2: row.p_b2 },
    }

    let round = group.rounds.find(r => r.number === match.round)
    if (!round) {
      round = { number: match.round, matches: [] }
      group.rounds.push(round)
    }
    round.matches.push(match)
  }

  return [...groups.values()]
    .sort((x, y) => y.startsAt.localeCompare(x.startsAt))
    .map((group): AdminEventGroup => ({
      eventId: group.eventId,
      title: group.title,
      subtitle: group.subtitle,
      courts: group.courts,
      rounds: group.rounds.sort((x, y) => x.number - y.number),
    }))
}
