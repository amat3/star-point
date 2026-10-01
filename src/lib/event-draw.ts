import type { SupabaseClient } from '@supabase/supabase-js'
import { toTitleCase, totalGames } from '@/lib/utils'
import type { Hand } from '@/components/atoms/HandTag'
import type { CourtPlayer } from '@/components/molecules/CourtCard'
import type { DrawMatch, DrawRound } from '@/types/draw'

type DrawProfile = {
  full_name: string | null
  avatar_url: string | null
  court_position: Hand | null
  rating?: number | null
} | null

type DrawRow = {
  id: string
  round_number: number | null
  court_number: number | null
  court_name: string | null
  score_details: string | null
  status: DrawMatch['status']
  last_updated_by: string | null
  player_a1: string
  player_a2: string
  player_b1: string
  player_b2: string
  p_a1: DrawProfile
  p_a2: DrawProfile
  p_b1: DrawProfile
  p_b2: DrawProfile
  court: { name: string } | { name: string }[] | null
}

/**
 * Builds the draw of an event for one viewer. Players only receive their own
 * matches; admins receive every match plus each player's level. Filtering and
 * level stripping happen here, so other people's data never reach the browser.
 */
export async function getEventDraw(
  supabase: SupabaseClient,
  eventId: string,
  userId: string,
  isAdmin: boolean
): Promise<DrawRound[]> {
  const fields = `full_name, avatar_url, court_position${isAdmin ? ', rating' : ''}`

  let query = supabase
    .from('matches')
    .select(`
      id, round_number, court_number, court_name, score_details, status, last_updated_by,
      player_a1, player_a2, player_b1, player_b2,
      p_a1:profiles!player_a1(${fields}),
      p_a2:profiles!player_a2(${fields}),
      p_b1:profiles!player_b1(${fields}),
      p_b2:profiles!player_b2(${fields}),
      court:courts(name)
    `)
    .eq('event_id', eventId)
    .order('round_number', { ascending: true })
    .order('court_number', { ascending: true })

  if (!isAdmin) {
    query = query.or(`player_a1.eq.${userId},player_a2.eq.${userId},player_b1.eq.${userId},player_b2.eq.${userId}`)
  }

  const { data } = await query
  const rows = (data ?? []) as unknown as DrawRow[]

  const toPlayer = (id: string, profile: DrawProfile): CourtPlayer => ({
    userId: id,
    name: toTitleCase(profile?.full_name) || 'Jugador',
    avatarUrl: profile?.avatar_url ?? null,
    hand: profile?.court_position ?? null,
    ...(isAdmin && profile?.rating != null ? { level: profile.rating.toFixed(1).replace('.', ',') } : {}),
  })

  const rounds = new Map<number, DrawMatch[]>()

  for (const row of rows) {
    const teamA = [toPlayer(row.player_a1, row.p_a1), toPlayer(row.player_a2, row.p_a2)]
    const teamB = [toPlayer(row.player_b1, row.p_b1), toPlayer(row.player_b2, row.p_b2)]
    const inA = teamA.some(p => p.userId === userId)
    const inB = teamB.some(p => p.userId === userId)
    const mine = inA || inB

    // The viewer's own team always goes on the left.
    const swap = inB
    const hasScore = (row.score_details ?? '0-0') !== '0-0'
    const games = hasScore ? totalGames(row.score_details, !swap) : null

    const court = Array.isArray(row.court) ? row.court[0] : row.court
    const match: DrawMatch = {
      id: row.id,
      round: row.round_number ?? 1,
      title: court?.name ?? row.court_name ?? (row.court_number ? `Pista ${row.court_number}` : 'Pista por asignar'),
      mine,
      status: row.status,
      games: games ? { a: games.mine, b: games.theirs } : null,
      waitingForMe: mine && row.status === 'pending' && hasScore && row.last_updated_by !== userId,
      waitingForRival: mine && row.status === 'pending' && hasScore && row.last_updated_by === userId,
      teamA: swap ? teamB : teamA,
      teamB: swap ? teamA : teamB,
      dialogMatch: {
        id: row.id,
        score_details: row.score_details ?? '0-0',
        p_a1: row.p_a1,
        p_a2: row.p_a2,
        p_b1: row.p_b1,
        p_b2: row.p_b2,
      },
    }

    const list = rounds.get(match.round) ?? []
    list.push(match)
    rounds.set(match.round, list)
  }

  return [...rounds.entries()]
    .sort(([a], [b]) => a - b)
    .map(([number, matches]) => ({ number, matches }))
}
