'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { toTitleCase, formatRelativeDay, totalGames, roundEndsAt } from '@/lib/utils'
import { applyMatchConfirmation, parseGames, type ConfirmableMatch } from '@/lib/confirm-match'

export async function getPlayerGameStats(userId: string) {
  const supabase = await createClient()

  const { data: matches } = await supabase
    .from('matches')
    .select('player_a1, player_a2, score_details')
    .eq('status', 'confirmed')
    .or(`player_a1.eq.${userId},player_a2.eq.${userId},player_b1.eq.${userId},player_b2.eq.${userId}`)

  let gamesWon = 0
  let gamesLost = 0

  for (const match of matches ?? []) {
    const isTeamA = match.player_a1 === userId || match.player_a2 === userId
    const { gamesA, gamesB } = parseGames(match.score_details || '')
    gamesWon += isTeamA ? gamesA : gamesB
    gamesLost += isTeamA ? gamesB : gamesA
  }

  return { gamesWon, gamesLost }
}

export type PlayerProfileDetails = {
  id: string
  full_name: string | null
  avatar_url: string | null
  gender: 'masculino' | 'femenino' | 'otro' | null
  preferred_hand: 'diestro' | 'zurdo' | 'ambidiestro' | null
  court_position: 'reves' | 'drive' | 'ambos' | null
  matches_played: number
  win_ratio: number
  gamesWon: number
  gamesLost: number
  is_guest: boolean
}

export async function getPlayerProfileDetails(userId: string): Promise<PlayerProfileDetails | null> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, gender, preferred_hand, court_position, matches_played, win_ratio, is_guest')
    .eq('id', userId)
    .maybeSingle()

  if (!profile) return null

  const { gamesWon, gamesLost } = await getPlayerGameStats(userId)

  return { ...profile, gamesWon, gamesLost }
}

export async function confirmMatch(matchId: string) {
  console.log('🎾 Iniciando confirmación de partido:', matchId)
  const supabase = await createClient()

  // 1. Obtener los detalles del partido
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('*, events(is_test)')
    .eq('id', matchId)
    .single()

  if (matchError || !match) {
    console.error('❌ Partido no encontrado:', matchError)
    return { success: false, error: 'Partido no encontrado' }
  }

  // Check Auth and Permissions
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Acceso denegado' }

  // Check Admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'
  const isCreator = match.creator_id === user.id
  const isParticipant = [match.player_a1, match.player_a2, match.player_b1, match.player_b2].includes(user.id)

  if (!isAdmin && !isCreator && !isParticipant) {
     return { success: false, error: 'No tienes permisos para confirmar este partido' }
  }


  if (match.status === 'expired') {
    return { success: false, error: 'Este partido ha caducado' }
  }

  return applyMatchConfirmation(supabase, match as ConfirmableMatch)
}

export async function updateMatchScore(
  matchId: string,
  data: {
    score_details: string
  }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario no autenticado')

  // 1. Get Match to verify permission
  const { data: match, error: fetchError } = await supabase
    .from('matches')
    .select('creator_id, status, player_a1, player_a2, player_b1, player_b2')
    .eq('id', matchId)
    .single()

  if (fetchError || !match) throw new Error('Partido no encontrado')

  // 2. Permission check (Creator, Admin, or Participant)
  const isCreator = match.creator_id === user.id

  if (!isCreator) {
    const isParticipant = [match.player_a1, match.player_a2, match.player_b1, match.player_b2].includes(user.id)
    if (!isParticipant) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') throw new Error('No tienes permiso para editar este partido')
    }
  }

  // 3. Status check
  if (match.status !== 'pending' && match.status !== 'disputed') {
    throw new Error('Solo se pueden editar partidos pendientes o disputados')
  }

  const updateData = {
    score_details: data.score_details,
    sets_a: 0,
    sets_b: 0,
    status: 'pending',
    last_updated_by: user.id,
  }

  const { error } = await supabase
    .from('matches')
    .update(updateData)
    .eq('id', matchId)

  if (error) throw new Error(error.message)

  revalidatePath('/')
  return { success: true }
}

/**
 * Rota las parejas de un partido ya publicado entre sus 3 combinaciones
 * posibles (jugador_a1 siempre fijo como ancla):
 *   a1+a2 vs b1+b2  →  a1+b1 vs a2+b2  →  a1+b2 vs a2+b1  →  (vuelve al inicio)
 * Cada pulsación avanza un paso. Solo admin, y solo mientras el partido no
 * esté confirmado ni tenga ya un resultado introducido (evita desincronizar
 * quién jugó de verdad de a quién se le atribuye el marcador/rating).
 */
export async function rotateMatchPlayers(matchId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Requiere admin')

  const { data: match } = await supabase
    .from('matches')
    .select('event_id, status, score_details, player_a1, player_a2, player_b1, player_b2')
    .eq('id', matchId)
    .single()

  if (!match) throw new Error('Partido no encontrado')
  if (match.status === 'confirmed') throw new Error('No se puede reorganizar un partido ya confirmado')
  if (match.score_details && match.score_details !== '0-0') throw new Error('Ya se ha introducido un resultado para este partido')

  const { error } = await supabase
    .from('matches')
    .update({
      player_a2: match.player_b1,
      player_b1: match.player_b2,
      player_b2: match.player_a2,
    })
    .eq('id', matchId)

  if (error) throw new Error(error.message)

  revalidatePath('/')
  return { success: true }
}

export type HistoryMatch = {
  id: string
  // Date of the event when there is one, otherwise when the match was created
  playedAt: string
  title: string | null
  clubName: string | null
  outcome: 'win' | 'loss' | 'draw'
  // The viewer's team first
  myTeam: string[]
  opponents: string[]
  games: { mine: number; theirs: number }
}

const HISTORY_PAGE_SIZE = 10

/**
 * Página del historial de partidos confirmados de la persona que llama. Ignora
 * cualquier id recibido: siempre es el historial del usuario autenticado.
 */
export async function getMatchHistory(page: number): Promise<{ matches: HistoryMatch[]; hasMore: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { matches: [], hasMore: false }

  const from = Math.max(page - 1, 0) * HISTORY_PAGE_SIZE
  // One extra row tells us whether there is another page
  const to = from + HISTORY_PAGE_SIZE

  const { data, error } = await supabase
    .from('matches')
    .select(`
      id, created_at, score_details, player_a1, player_a2, player_b1, player_b2,
      p_a1:profiles!player_a1(full_name),
      p_a2:profiles!player_a2(full_name),
      p_b1:profiles!player_b1(full_name),
      p_b2:profiles!player_b2(full_name),
      event:events(title, start_time, club:clubs(name))
    `)
    .or(`player_a1.eq.${user.id},player_a2.eq.${user.id},player_b1.eq.${user.id},player_b2.eq.${user.id}`)
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('Error fetching match history:', error)
    return { matches: [], hasMore: false }
  }

  type Row = Omit<LastMatchRow, 'event'> & {
    event: { title: string; start_time: string; club: { name: string } | { name: string }[] | null } | null
  }
  const rows = (data ?? []) as unknown as Row[]
  const firstName = (name: string | null | undefined) => toTitleCase(name).split(' ')[0] || 'Jugador'

  const matches = rows.slice(0, HISTORY_PAGE_SIZE).map((m): HistoryMatch => {
    const inTeamA = m.player_a1 === user.id || m.player_a2 === user.id
    const mine = inTeamA ? [m.p_a1, m.p_a2] : [m.p_b1, m.p_b2]
    const theirs = inTeamA ? [m.p_b1, m.p_b2] : [m.p_a1, m.p_a2]
    const games = totalGames(m.score_details, inTeamA)
    const club = Array.isArray(m.event?.club) ? m.event?.club[0] : m.event?.club

    return {
      id: m.id,
      playedAt: m.event?.start_time ?? m.created_at,
      title: m.event?.title?.trim() ?? null,
      clubName: club?.name ?? null,
      outcome: games.mine > games.theirs ? 'win' : games.mine < games.theirs ? 'loss' : 'draw',
      myTeam: mine.map(p => firstName(p?.full_name)),
      opponents: theirs.map(p => firstName(p?.full_name)),
      games,
    }
  })

  return { matches, hasMore: rows.length > HISTORY_PAGE_SIZE }
}

export type LastMatch = {
  id: string
  outcome: 'win' | 'loss' | 'draw'
  partnerName: string | null
  // Total games from the user's point of view, e.g. "8-2"
  score: string
  playedAt: string
  clubName: string | null
}

type LastMatchRow = {
  id: string
  created_at: string
  score_details: string | null
  player_a1: string
  player_a2: string
  player_b1: string
  player_b2: string
  p_a1: { full_name: string | null } | null
  p_a2: { full_name: string | null } | null
  p_b1: { full_name: string | null } | null
  p_b2: { full_name: string | null } | null
  event: { start_time: string; club: { name: string } | null } | null
}

/** Último partido confirmado del jugador, orientado desde su punto de vista. */
export async function getLastMatch(userId: string): Promise<LastMatch | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('matches')
    .select(`
      id, created_at, score_details, player_a1, player_a2, player_b1, player_b2,
      p_a1:profiles!player_a1(full_name),
      p_a2:profiles!player_a2(full_name),
      p_b1:profiles!player_b1(full_name),
      p_b2:profiles!player_b2(full_name),
      event:events(start_time, club:clubs(name))
    `)
    .eq('status', 'confirmed')
    .or(`player_a1.eq.${userId},player_a2.eq.${userId},player_b1.eq.${userId},player_b2.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null
  const m = data as unknown as LastMatchRow

  const inTeamA = m.player_a1 === userId || m.player_a2 === userId
  const partner = inTeamA
    ? (m.player_a1 === userId ? m.p_a2 : m.p_a1)
    : (m.player_b1 === userId ? m.p_b2 : m.p_b1)

  const { mine, theirs } = totalGames(m.score_details, inTeamA)

  return {
    id: m.id,
    outcome: mine > theirs ? 'win' : mine < theirs ? 'loss' : 'draw',
    partnerName: partner?.full_name ?? null,
    score: `${mine}-${theirs}`,
    playedAt: m.event?.start_time ?? m.created_at,
    clubName: m.event?.club?.name ?? null,
  }
}


export type PendingAction = {
  id: string
  kind: 'record' | 'confirm'
  when: string
  partnerName: string | null
  myTeam: string[]
  opponents: string[]
  // Total games from the user's point of view; null while there is no result yet
  games: { mine: number; theirs: number } | null
  courtLabel: string | null
  // Raw match data for the score dialog
  match: {
    id: string
    score_details: string
    p_a1: { full_name: string | null } | null
    p_a2: { full_name: string | null } | null
    p_b1: { full_name: string | null } | null
    p_b2: { full_name: string | null } | null
  }
}

type PendingRow = Omit<LastMatchRow, 'event'> & {
  event: { start_time: string; duration_minutes: number | null; rounds: number | null; club: { name: string } | null } | null
  last_updated_by: string | null
  court_number: number | null
  court_name: string | null
  court: { name: string } | { name: string }[] | null
  round_number: number | null
}

// Real court name when assigned (court row, then legacy text), otherwise the round-local number.
function courtName(m: Pick<PendingRow, 'court' | 'court_name' | 'court_number'>) {
  const court = Array.isArray(m.court) ? m.court[0] : m.court
  return court?.name ?? m.court_name ?? (m.court_number ? `Pista ${m.court_number}` : null)
}

export type PendingActionsResult = {
  actions: PendingAction[]
  // When the next "introducir resultado" card becomes visible (a round ends); null if none
  nextRevealAt: string | null
}

/**
 * Partidos del jugador que esperan algo de él: introducir el resultado (0-0)
 * o confirmar el que ha metido el rival. Si el último en tocarlo fue él, está
 * esperando al rival y no se muestra. La tarjeta de introducir resultado de una
 * ronda solo aparece cuando esa ronda ha terminado (hora estimada por reparto
 * igual de la duración del evento), para no enseñar las 3 rondas desde el sorteo.
 */
export async function getPendingActions(userId: string): Promise<PendingActionsResult> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('matches')
    .select(`
      id, created_at, score_details, last_updated_by, court_number, court_name, round_number,
      court:courts(name),
      player_a1, player_a2, player_b1, player_b2,
      p_a1:profiles!player_a1(full_name),
      p_a2:profiles!player_a2(full_name),
      p_b1:profiles!player_b1(full_name),
      p_b2:profiles!player_b2(full_name),
      event:events(start_time, duration_minutes, rounds, club:clubs(name))
    `)
    .eq('status', 'pending')
    .or(`player_a1.eq.${userId},player_a2.eq.${userId},player_b1.eq.${userId},player_b2.eq.${userId}`)
    .order('created_at', { ascending: false })

  const rows = (data ?? []) as unknown as PendingRow[]
  const firstName = (name: string | null | undefined) => toTitleCase(name).split(' ')[0] || 'Jugador'

  const now = Date.now()
  let nextReveal: number | null = null

  const actions = rows
    .filter(m => m.last_updated_by !== userId)
    .filter(m => {
      const hasScore = (m.score_details ?? '0-0') !== '0-0'
      if (hasScore || !m.event) return true
      const endsAt = roundEndsAt(m.event.start_time, m.event.duration_minutes, m.event.rounds, m.round_number).getTime()
      if (endsAt <= now) return true
      nextReveal = nextReveal === null ? endsAt : Math.min(nextReveal, endsAt)
      return false
    })
    .map(m => {
      const inTeamA = m.player_a1 === userId || m.player_a2 === userId
      const [me, partner, rival1, rival2] = inTeamA
        ? (m.player_a1 === userId ? [m.p_a1, m.p_a2, m.p_b1, m.p_b2] : [m.p_a2, m.p_a1, m.p_b1, m.p_b2])
        : (m.player_b1 === userId ? [m.p_b1, m.p_b2, m.p_a1, m.p_a2] : [m.p_b2, m.p_b1, m.p_a1, m.p_a2])

      const raw = m.score_details ?? '0-0'
      const hasScore = raw !== '0-0'
      const games = hasScore ? totalGames(raw, inTeamA) : null

      return {
        id: m.id,
        kind: hasScore ? 'confirm' as const : 'record' as const,
        when: formatRelativeDay(m.event?.start_time ?? m.created_at),
        partnerName: partner?.full_name ? firstName(partner.full_name) : null,
        myTeam: [firstName(me?.full_name), firstName(partner?.full_name)],
        opponents: [firstName(rival1?.full_name), firstName(rival2?.full_name)],
        games,
        courtLabel: [courtName(m), m.round_number ? `Ronda ${m.round_number}` : null].filter(Boolean).join(' · ') || null,
        match: {
          id: m.id,
          score_details: raw,
          p_a1: m.p_a1,
          p_a2: m.p_a2,
          p_b1: m.p_b1,
          p_b2: m.p_b2,
        },
      }
    })

  return { actions, nextRevealAt: nextReveal === null ? null : new Date(nextReveal).toISOString() }
}
