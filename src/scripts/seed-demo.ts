/**
 * Fills the DEMO Supabase project with fictional data (Springfield players, 8 past mixings with
 * a real draw and real ELO, an open mixing, a published draw and two partidos).
 *
 * It reads ONLY `.env.demo.local` and refuses to run against anything but the demo project, so it
 * can never touch the production data.
 *
 * Usage: npx -y tsx src/scripts/seed-demo.ts                    (dry run: simulates, writes nothing)
 *        npx -y tsx src/scripts/seed-demo.ts --apply            (writes; the demo must be empty)
 *        npx -y tsx src/scripts/seed-demo.ts --apply --reset    (wipes the demo data first, then writes)
 *
 * `--apply` needs DEMO_PASSWORD (the password of the two demo accounts) in `.env.demo.local`.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { calculateNewRating, applyGuestProtection } from '../lib/rating-logic'
import { generateEventRounds, type MixingParticipant, type MixingConfig } from '../lib/mixing-algorithm'

const DEMO_REF = 'dibjelontnvnqdqaljqo'
const PROD_REF = 'idnovsdkodfxaumkbosy'
const APPLY = process.argv.includes('--apply')
const RESET = process.argv.includes('--reset')
const PAST_EVENTS = 8
const PLAYERS_PER_EVENT = 12
const ROUNDS = 3
const MADRID_TZ = 'Europe/Madrid'

// --- environment: only the demo file, only the demo project -----------------------------------
const env: Record<string, string> = {}
readFileSync('.env.demo.local', 'utf-8').split('\n').forEach((line) => {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
})
const url = env.NEXT_PUBLIC_SUPABASE_URL ?? ''
if (!url.includes(DEMO_REF) || url.includes(PROD_REF)) {
  throw new Error(`Refusing to run: NEXT_PUBLIC_SUPABASE_URL is not the demo project (${DEMO_REF}).`)
}
if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing in .env.demo.local')
if (APPLY && !env.DEMO_PASSWORD) {
  throw new Error('Add DEMO_PASSWORD=<the password of the demo accounts> to .env.demo.local before using --apply.')
}
const db = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

// --- deterministic randomness (same data on every run) ----------------------------------------
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20261007)
const pick = <T,>(items: T[]): T => items[Math.floor(rand() * items.length)]
function shuffle<T>(items: T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

// --- the cast ---------------------------------------------------------------------------------
interface Character {
  key: string
  name: string
  email: string
  gender: 'masculino' | 'femenino'
  side: 'reves' | 'drive' | 'ambos'
  skill: number // hidden "true" level: it only drives who wins; the shown rating comes from the Elo replay
  role?: 'admin'
}
const CAST: Character[] = [
  { key: 'homer', name: 'Homer Simpson', email: 'demo@example.com', gender: 'masculino', side: 'drive', skill: 3.0 },
  { key: 'marge', name: 'Marge Simpson', email: 'marge@demo.invalid', gender: 'femenino', side: 'reves', skill: 3.4 },
  { key: 'bart', name: 'Bart Simpson', email: 'bart@demo.invalid', gender: 'masculino', side: 'drive', skill: 3.7 },
  { key: 'lisa', name: 'Lisa Simpson', email: 'lisa@demo.invalid', gender: 'femenino', side: 'reves', skill: 4.4 },
  { key: 'ned', name: 'Ned Flanders', email: 'ned@demo.invalid', gender: 'masculino', side: 'ambos', skill: 3.9 },
  { key: 'moe', name: 'Moe Szyslak', email: 'moe@demo.invalid', gender: 'masculino', side: 'reves', skill: 3.1 },
  { key: 'barney', name: 'Barney Gumble', email: 'barney@demo.invalid', gender: 'masculino', side: 'drive', skill: 2.7 },
  { key: 'apu', name: 'Apu Nahasapeemapetilon', email: 'apu@demo.invalid', gender: 'masculino', side: 'reves', skill: 4.1 },
  { key: 'milhouse', name: 'Milhouse Van Houten', email: 'milhouse@demo.invalid', gender: 'masculino', side: 'reves', skill: 2.9 },
  { key: 'nelson', name: 'Nelson Muntz', email: 'nelson@demo.invalid', gender: 'masculino', side: 'drive', skill: 3.8 },
  { key: 'krusty', name: 'Krusty el Payaso', email: 'krusty@demo.invalid', gender: 'masculino', side: 'ambos', skill: 3.3 },
  { key: 'ralph', name: 'Ralph Wiggum', email: 'ralph@demo.invalid', gender: 'masculino', side: 'drive', skill: 2.6 },
  { key: 'edna', name: 'Edna Krabappel', email: 'edna@demo.invalid', gender: 'femenino', side: 'reves', skill: 3.2 },
  { key: 'lenny', name: 'Lenny Leonard', email: 'lenny@demo.invalid', gender: 'masculino', side: 'ambos', skill: 3.5 },
  { key: 'carl', name: 'Carl Carlson', email: 'carl@demo.invalid', gender: 'masculino', side: 'reves', skill: 3.7 },
  { key: 'skinner', name: 'Seymour Skinner', email: 'admin-demo@example.com', gender: 'masculino', side: 'ambos', skill: 4.0, role: 'admin' },
]

// --- dates: Wednesdays at 20:00 Madrid --------------------------------------------------------
function madridParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: MADRID_TZ, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return { y: +get('year'), m: +get('month'), d: +get('day'), weekday: get('weekday') }
}
function offsetHours(date: Date) {
  const tz = new Intl.DateTimeFormat('en-US', { timeZone: MADRID_TZ, timeZoneName: 'shortOffset' }).formatToParts(date).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+0'
  const m = tz.match(/GMT([+-]\d+)/)
  return m ? parseInt(m[1], 10) : 0
}
/** `days` from today at `hour`:00 Madrid, as a UTC ISO string (DST-safe for that date). */
function madridAt(days: number, hour: number, minute = 0): string {
  const base = new Date(); base.setUTCDate(base.getUTCDate() + days); base.setUTCHours(12, 0, 0, 0)
  const { y, m, d } = madridParts(base)
  return new Date(Date.UTC(y, m - 1, d, hour - offsetHours(base), minute)).toISOString()
}
/** Days from today to the closest Wednesday in that direction (strictly past or strictly future). */
function wednesdayOffset(direction: -1 | 1, skip = 0): number {
  const idx: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  let days = direction
  for (;;) {
    const probe = new Date(); probe.setUTCDate(probe.getUTCDate() + days); probe.setUTCHours(12)
    if (idx[madridParts(probe).weekday] === 3) { if (skip === 0) return days; skip-- }
    days += direction
  }
}

// --- the simulation ---------------------------------------------------------------------------
interface SimMatch {
  round: number; court: number
  a1: Character; a2: Character; b1: Character; b2: Character
  score: string; change: number
  history: { id: string; before: number; after: number }[]
}
interface SimEvent { startsAt: string; participants: Character[]; matches: SimMatch[] }

const rating: Record<string, number> = Object.fromEntries(CAST.map((c) => [c.key, 3.5]))
const played: Record<string, number> = Object.fromEntries(CAST.map((c) => [c.key, 0]))
const won: Record<string, number> = Object.fromEntries(CAST.map((c) => [c.key, 0]))
const byKey = Object.fromEntries(CAST.map((c) => [c.key, c]))

function playMatch(a1: Character, a2: Character, b1: Character, b2: Character): { score: string; change: number; history: SimMatch['history'] } {
  // Who wins comes from the hidden skill; the games from how clear the win is
  const sA = (a1.skill + a2.skill) / 2, sB = (b1.skill + b2.skill) / 2
  const pA = 1 / (1 + Math.pow(10, -(sA - sB) / 1.1))
  const draw = rand() < 0.06
  const aWins = rand() < pA
  const total = pick([10, 11, 12])
  const clarity = Math.abs(pA - 0.5)
  let hi: number, lo: number
  if (draw) { hi = lo = total / 2 | 0; if (total % 2) hi = lo + 1 }
  else {
    const margin = 1 + Math.floor(rand() * (2 + 7 * clarity))
    hi = Math.min(Math.ceil((total + margin) / 2), total - 1); lo = total - hi
  }
  const gamesA = draw ? hi : aWins ? hi : lo
  const gamesB = draw ? lo : aWins ? lo : hi
  const resA = gamesA === gamesB ? 'draw' : gamesA > gamesB ? 'win' : 'loss'
  const resB = gamesA === gamesB ? 'draw' : gamesB > gamesA ? 'win' : 'loss'

  const r = (c: Character) => rating[c.key]
  const calc = (c: Character, partner: Character, o1: Character, o2: Character, gf: number, ga: number, res: 'win' | 'draw' | 'loss') =>
    applyGuestProtection(r(c), calculateNewRating(r(c), r(partner), r(o1), r(o2), gf, ga, res, played[c.key]), false, false)
  const out = [
    { c: a1, res: calc(a1, a2, b1, b2, gamesA, gamesB, resA), won: resA === 'win' },
    { c: a2, res: calc(a2, a1, b1, b2, gamesA, gamesB, resA), won: resA === 'win' },
    { c: b1, res: calc(b1, b2, a1, a2, gamesB, gamesA, resB), won: resB === 'win' },
    { c: b2, res: calc(b2, b1, a1, a2, gamesB, gamesA, resB), won: resB === 'win' },
  ]
  const history = out.map((o) => ({ id: o.c.key, before: r(o.c), after: o.res.newRating }))
  out.forEach((o) => { rating[o.c.key] = o.res.newRating; played[o.c.key]++; if (o.won) won[o.c.key]++ })
  return { score: `${gamesA}-${gamesB}`, change: out[0].res.change, history }
}

function toParticipants(cast: Character[], prior: SimEvent | null): MixingParticipant[] {
  const enc: Record<string, Record<string, number>> = {}
  const partners: Record<string, string[]> = {}
  prior?.matches.forEach((m) => {
    const all = [m.a1, m.a2, m.b1, m.b2]
    all.forEach((x) => all.forEach((y) => { if (x.key !== y.key) { (enc[x.key] ??= {})[y.key] = ((enc[x.key] ?? {})[y.key] ?? 0) + 1 } }))
    ;[[m.a1, m.a2], [m.b1, m.b2]].forEach(([x, y]) => { (partners[x.key] ??= []).push(y.key); (partners[y.key] ??= []).push(x.key) })
  })
  return cast.map((c) => ({
    id: c.key, rating: rating[c.key], gender: c.gender, court_position: c.side, full_name: c.name,
    encounter_counts: enc[c.key] ?? {}, session_encounter_counts: {}, partner_history: partners[c.key] ?? [], session_partner_history: [],
  }))
}

const MIXING: MixingConfig = { genderMode: 'open', prioritizeLevel: true, forcePosition: true, exclusions: [{ playerA: 'bart', playerB: 'skinner', type: 'no_contact' }] }

function simulateEvent(startsAt: string, participants: Character[], prior: SimEvent | null, playIt: boolean): SimEvent {
  const rounds = generateEventRounds(toParticipants(participants, prior), MIXING, ROUNDS)
  const matches: SimMatch[] = []
  rounds.forEach((round, ri) => {
    round.matches.forEach((m) => {
      const [a1, a2] = m.pairA.map((p) => byKey[p.id]); const [b1, b2] = m.pairB.map((p) => byKey[p.id])
      const result = playIt ? playMatch(a1, a2, b1, b2) : { score: '0-0', change: 0, history: [] }
      matches.push({ round: ri + 1, court: m.courtNumber, a1, a2, b1, b2, score: result.score, change: result.change, history: result.history })
    })
  })
  return { startsAt, participants, matches }
}

// 8 past mixings, oldest first
const past: SimEvent[] = []
for (let i = PAST_EVENTS; i >= 1; i--) {
  const startsAt = madridAt(wednesdayOffset(-1, i - 1), 20)
  // Ralph is the newcomer: he only joins the last two mixings
  const regulars = shuffle(CAST.filter((c) => c.key !== 'ralph')).slice(0, PLAYERS_PER_EVENT - (i <= 2 ? 1 : 0))
  const roster = i <= 2 ? [...regulars, byKey.ralph] : regulars
  past.push(simulateEvent(startsAt, roster, past[past.length - 1] ?? null, true))
}
// Published draw (next Wednesday, nothing played yet) and an open mixing (the one after)
// Homer (the demo player account) is always in the published draw, so he sees his own matches
const drawRoster = [byKey.homer, ...shuffle(CAST.filter((c) => c.key !== 'homer'))].slice(0, PLAYERS_PER_EVENT)
const drawEvent = simulateEvent(madridAt(wednesdayOffset(1, 0), 20), drawRoster, past[past.length - 1], false)
const openEventStart = madridAt(wednesdayOffset(1, 1), 20)
const openParticipants = shuffle(CAST.filter((c) => c.key !== 'homer')).slice(0, PLAYERS_PER_EVENT - 1)

// --- report -----------------------------------------------------------------------------------
console.log(`\nDemo project: ${DEMO_REF} · ${APPLY ? (RESET ? 'APPLY + RESET' : 'APPLY') : 'DRY RUN (nothing is written)'}\n`)
console.log('Final ratings after the 8 past mixings:')
Object.keys(rating).sort((a, b) => rating[b] - rating[a]).forEach((k) =>
  console.log(`  ${byKey[k].name.padEnd(24)} ${rating[k].toFixed(3)}  ·  ${won[k]}/${played[k]} ganados`))
console.log(`\nPast mixings: ${past.length} · matches: ${past.reduce((n, e) => n + e.matches.length, 0)} · history rows: ${past.reduce((n, e) => n + e.matches.reduce((m, x) => m + x.history.length, 0), 0)}`)
console.log(`Published draw: ${drawEvent.startsAt} · ${drawEvent.matches.length} matches (pending)`)
console.log(`Open mixing:    ${openEventStart} · ${openParticipants.length}/12 signed up`)
const sample = past[past.length - 1].matches.slice(0, 3).map((m) => `  R${m.round} ${m.a1.name.split(' ')[0]}/${m.a2.name.split(' ')[0]} ${m.score} ${m.b1.name.split(' ')[0]}/${m.b2.name.split(' ')[0]}`)
console.log('\nSample (latest past mixing):\n' + sample.join('\n'))

if (!APPLY) { console.log('\n(dry run: nothing written. Use --apply to write.)'); process.exit(0) }

// --- writing ----------------------------------------------------------------------------------
async function wipe() {
  console.log('\nWiping the demo data...')
  // children first; event_participants has no `id` column
  const tables: [string, string][] = [
    ['rating_history', 'id'], ['matches', 'id'], ['event_participants', 'event_id'], ['mixing_exclusions', 'id'],
    ['notifications', 'id'], ['push_subscriptions', 'id'], ['mixing_incentives', 'id'], ['events', 'id'], ['courts', 'id'], ['clubs', 'id'],
  ]
  for (const [table, key] of tables) {
    const { error } = await db.from(table).delete().not(key, 'is', null)
    if (error) throw new Error(`${table}: ${error.message}`)
  }
  const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 })
  for (const u of users?.users ?? []) await db.auth.admin.deleteUser(u.id)
}

async function main() {
  const { count } = await db.from('profiles').select('id', { count: 'exact', head: true })
  if ((count ?? 0) > 0 && !RESET) throw new Error('The demo already has data. Use --apply --reset to wipe it and write again.')
  if (RESET) await wipe()

  // clubs and courts
  const clubs = [
    { name: 'Springfield Padel Club', courts: 9 },
    { name: 'Shelbyville Sports', courts: 5 },
    { name: 'Evergreen Terrace Club', courts: 4 },
  ]
  const clubIds: Record<string, string> = {}
  const courtIds: Record<string, string[]> = {}
  for (const club of clubs) {
    const { data: c } = await db.from('clubs').insert({ name: club.name }).select('id').single().throwOnError()
    clubIds[club.name] = c!.id
    const { data: cs } = await db.from('courts').insert(Array.from({ length: club.courts }, (_, i) => ({ club_id: c!.id, name: `Pista ${i + 1}`, position: i + 1 }))).select('id, position').throwOnError()
    courtIds[club.name] = (cs ?? []).sort((a, b) => a.position - b.position).map((x) => x.id)
  }
  const MAIN = 'Springfield Padel Club'

  // users + profiles
  const uid: Record<string, string> = {}
  for (const c of CAST) {
    const { data, error } = await db.auth.admin.createUser({
      email: c.email, password: c.email.endsWith('@example.com') ? env.DEMO_PASSWORD : crypto.randomUUID(), email_confirm: true,
      user_metadata: { full_name: c.name },
    })
    if (error || !data.user) throw new Error(`createUser ${c.email}: ${error?.message}`)
    uid[c.key] = data.user.id
    await db.from('profiles').update({
      full_name: c.name, role: c.role ?? 'player', gender: c.gender, court_position: c.side, preferred_hand: 'diestro', is_guest: false,
      rating: rating[c.key], matches_played: played[c.key], matches_won: won[c.key], win_ratio: played[c.key] ? won[c.key] / played[c.key] : 0,
    }).eq('id', uid[c.key]).throwOnError()
  }
  const admin = uid.skinner

  const makeEvent = async (startsAt: string, status: string, participants: Character[], createdAt?: string) => {
    const { data: ev } = await db.from('events').insert({
      title: 'Mixing Padel y Risas', start_time: startsAt, max_spots: PLAYERS_PER_EVENT, rounds: ROUNDS, duration_minutes: 90,
      created_by: admin, status, is_test: false, kind: 'mixing', club_id: clubIds[MAIN], ...(createdAt ? { created_at: createdAt } : {}),
    }).select('id').single().throwOnError()
    const start = new Date(startsAt).getTime()
    await db.from('event_participants').insert(participants.map((p, i) => ({
      event_id: ev!.id, user_id: uid[p.key], joined_at: new Date(start - (6 * 24 * 60 - i * 7) * 60_000).toISOString(),
    }))).throwOnError()
    return ev!.id as string
  }

  const insertMatches = async (eventId: string, ev: SimEvent, confirmed: boolean) => {
    const start = new Date(ev.startsAt).getTime()
    for (const m of ev.matches) {
      const at = new Date(start + (m.round - 1) * 30 * 60_000 + 90 * 60_000).toISOString()
      const { data: row } = await db.from('matches').insert({
        creator_id: admin, match_type: 'mixing', status: confirmed ? 'confirmed' : 'pending', event_id: eventId,
        player_a1: uid[m.a1.key], player_a2: uid[m.a2.key], player_b1: uid[m.b1.key], player_b2: uid[m.b2.key],
        sets_a: 0, sets_b: 0, score_details: m.score, rating_change: confirmed ? m.change : null,
        court_number: m.court, court_id: courtIds[MAIN][m.court - 1], court_name: `Pista ${m.court}`, round_number: m.round,
        last_updated_by: confirmed ? uid[m.a1.key] : null, created_at: confirmed ? at : new Date().toISOString(),
      }).select('id').single().throwOnError()
      if (confirmed) {
        await db.from('rating_history').insert(m.history.map((h) => ({
          player_id: uid[h.id], match_id: row!.id, rating_before: h.before, rating_after: h.after, created_at: at,
        }))).throwOnError()
      }
    }
  }

  console.log('\nWriting past mixings...')
  for (const ev of past) {
    const id = await makeEvent(ev.startsAt, 'in_progress', ev.participants, new Date(new Date(ev.startsAt).getTime() - 7 * 86_400_000).toISOString())
    await insertMatches(id, ev, true)
  }
  console.log('Writing the published draw and the open mixing...')
  const drawId = await makeEvent(drawEvent.startsAt, 'in_progress', drawEvent.participants)
  await insertMatches(drawId, drawEvent, false)
  await makeEvent(openEventStart, 'open', openParticipants)

  console.log('Writing two partidos and an exclusion...')
  const partido = async (organizer: Character, startsAt: string, needed: number, known: string[], notes: string | null, extra: Character[] = []) => {
    const { data: ev } = await db.from('events').insert({
      title: 'Partido', start_time: startsAt, max_spots: needed + 1, rounds: 1, duration_minutes: 90, created_by: uid[organizer.key],
      status: 'open', is_test: false, kind: 'match', club_id: clubIds[MAIN], known_players: known, notes,
    }).select('id').single().throwOnError()
    await db.from('event_participants').insert([organizer, ...extra].map((p) => ({ event_id: ev!.id, user_id: uid[p.key] }))).throwOnError()
  }
  await partido(byKey.bart, madridAt(1, 19), 1, ['Milhouse', 'Nelson'], 'Necesitamos un revés')
  await partido(byKey.marge, madridAt(2, 20, 30), 2, ['Patty Bouvier'], 'Partido mixto', [byKey.lisa])
  await db.from('mixing_exclusions').insert({ player_a: uid.bart, player_b: uid.skinner, type: 'no_contact', note: 'Mejor que no coincidan', created_by: admin }).throwOnError()

  console.log('\nDone. Demo accounts: demo@example.com (player) and admin-demo@example.com (admin), password = DEMO_PASSWORD.')
}

main().catch((e) => { console.error(e); process.exit(1) })
