/**
 * Recalcula retroactivamente rating_history y profiles.rating con el
 * MATCH_WEIGHT actual de src/lib/config.ts, rejugando en orden cronológico
 * real todos los partidos confirmados desde el principio.
 *
 * Uso: npx tsx src/scripts/retroactive-match-weight.ts           (dry-run, no escribe nada)
 *      npx tsx src/scripts/retroactive-match-weight.ts --apply   (escribe de verdad)
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { calculateNewRating } from '../lib/rating-logic'

const envContent = readFileSync('.env.local', 'utf-8')
const env: Record<string, string> = {}
envContent.split('\n').forEach((line) => {
  const match = line.match(/^([A-Z_0-9]+)=(.*)$/)
  if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '')
})

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const APPLY = process.argv.includes('--apply')

function parseGames(score: string) {
  let gamesA = 0
  let gamesB = 0
  if (!score) return { gamesA: 0, gamesB: 0 }
  score.split(' ').forEach((part) => {
    const [a, b] = part.split('-').map(Number)
    if (!isNaN(a) && !isNaN(b)) { gamesA += a; gamesB += b }
  })
  return { gamesA, gamesB }
}

async function main() {
  // 1. Traer todos los partidos confirmados con su rating_history (para el
  //    orden cronológico REAL de confirmación, no el de creación de la ronda).
  const { data: rows, error } = await supabase
    .from('rating_history')
    .select('id, player_id, match_id, created_at, matches!inner(player_a1, player_a2, player_b1, player_b2, score_details, status)')
    .eq('matches.status', 'confirmed')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  if (!rows || rows.length === 0) throw new Error('No se encontraron filas de rating_history')

  // Agrupar por match_id preservando el primer created_at de cada partido (4 filas por partido)
  const matchOrder: string[] = []
  const matchInfo: Record<string, { player_a1: string, player_a2: string, player_b1: string, player_b2: string, score_details: string }> = {}
  const rowsByMatch: Record<string, { id: string, player_id: string }[]> = {}

  for (const row of rows) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = row.matches as any
    if (!matchInfo[row.match_id]) {
      matchInfo[row.match_id] = { player_a1: m.player_a1, player_a2: m.player_a2, player_b1: m.player_b1, player_b2: m.player_b2, score_details: m.score_details }
      matchOrder.push(row.match_id)
      rowsByMatch[row.match_id] = []
    }
    rowsByMatch[row.match_id].push({ id: row.id, player_id: row.player_id })
  }

  console.log(`Rejugando ${matchOrder.length} partidos confirmados en orden cronológico real (MATCH_WEIGHT actual del código)...\n`)

  const rating: Record<string, number> = {}
  const played: Record<string, number> = {}
  const historyUpdates: { id: string, rating_before: number, rating_after: number }[] = []
  const matchRatingChange: Record<string, number> = {}

  for (const matchId of matchOrder) {
    const { player_a1: a1, player_a2: a2, player_b1: b1, player_b2: b2, score_details } = matchInfo[matchId]
    ;[a1, a2, b1, b2].forEach((id) => { if (!(id in rating)) { rating[id] = 3.5; played[id] = 0 } })

    const { gamesA, gamesB } = parseGames(score_details)
    const isDraw = gamesA === gamesB
    const teamAWon = gamesA > gamesB
    const resultA: 'win' | 'draw' | 'loss' = isDraw ? 'draw' : teamAWon ? 'win' : 'loss'
    const resultB: 'win' | 'draw' | 'loss' = isDraw ? 'draw' : !teamAWon ? 'win' : 'loss'

    const before: Record<string, number> = { [a1]: rating[a1], [a2]: rating[a2], [b1]: rating[b1], [b2]: rating[b2] }

    const rA1 = calculateNewRating(rating[a1], rating[a2], rating[b1], rating[b2], gamesA, gamesB, resultA, played[a1])
    const rA2 = calculateNewRating(rating[a2], rating[a1], rating[b1], rating[b2], gamesA, gamesB, resultA, played[a2])
    const rB1 = calculateNewRating(rating[b1], rating[b2], rating[a1], rating[a2], gamesB, gamesA, resultB, played[b1])
    const rB2 = calculateNewRating(rating[b2], rating[b1], rating[a1], rating[a2], gamesB, gamesA, resultB, played[b2])

    rating[a1] = rA1.newRating; rating[a2] = rA2.newRating
    rating[b1] = rB1.newRating; rating[b2] = rB2.newRating
    played[a1]++; played[a2]++; played[b1]++; played[b2]++

    matchRatingChange[matchId] = rA1.change

    const newRatings: Record<string, { before: number, after: number }> = {
      [a1]: { before: before[a1], after: rA1.newRating },
      [a2]: { before: before[a2], after: rA2.newRating },
      [b1]: { before: before[b1], after: rB1.newRating },
      [b2]: { before: before[b2], after: rB2.newRating },
    }

    for (const row of rowsByMatch[matchId]) {
      const nr = newRatings[row.player_id]
      if (nr) historyUpdates.push({ id: row.id, rating_before: nr.before, rating_after: nr.after })
    }
  }

  console.log('=== Ratings finales recalculados ===')
  const sorted = Object.entries(rating).sort((a, b) => b[1] - a[1])
  for (const [id, r] of sorted) console.log(`  ${id}  ${r.toFixed(3)}`)

  if (!APPLY) {
    console.log('\n(dry-run: no se ha escrito nada. Ejecuta con --apply para aplicar de verdad)')
    return
  }

  console.log(`\nAplicando ${historyUpdates.length} actualizaciones a rating_history...`)
  for (const u of historyUpdates) {
    const { error: updError } = await supabase
      .from('rating_history')
      .update({ rating_before: u.rating_before, rating_after: u.rating_after })
      .eq('id', u.id)
    if (updError) throw new Error(`rating_history ${u.id}: ${updError.message}`)
  }

  console.log(`Aplicando ${Object.keys(matchRatingChange).length} actualizaciones a matches.rating_change...`)
  for (const [matchId, change] of Object.entries(matchRatingChange)) {
    const { error: mError } = await supabase.from('matches').update({ rating_change: change }).eq('id', matchId)
    if (mError) throw new Error(`matches ${matchId}: ${mError.message}`)
  }

  console.log(`Aplicando ${sorted.length} actualizaciones a profiles.rating...`)
  for (const [id, r] of sorted) {
    const { error: pError } = await supabase.from('profiles').update({ rating: r }).eq('id', id)
    if (pError) throw new Error(`profiles ${id}: ${pError.message}`)
  }

  console.log('\nHecho.')
}

main().catch((e) => { console.error(e); process.exit(1) })
