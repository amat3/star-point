import { NextResponse } from 'next/server'
import { getAdminClient } from '@/utils/supabase/admin'
import { PLAYERS_PER_COURT } from '@/lib/utils'
import { sendPushToUsers } from '@/lib/push'

const MADRID_TZ = 'Europe/Madrid'
const COURTS = 3
const ROUNDS = 3
const DURATION_MINUTES = 90
const CREATED_BY = 'cb288b22-8fdb-4744-a421-c05646c37454' // Juanan

function getMadridHour(): number {
  return parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: MADRID_TZ,
      hour: 'numeric',
      hour12: false,
    }).format(new Date()),
    10
  )
}

// Computes the UTC ISO string for "next Wednesday at 22:00 Madrid",
// correctly accounting for DST on that specific date.
function getNextWednesdayAt22UTC(): string {
  const now = new Date()

  // Current day of week in Madrid
  const madridNow = new Date(now.toLocaleString('en-US', { timeZone: MADRID_TZ }))
  const currentDay = madridNow.getDay() // 0=Sun…6=Sat
  const daysToAdd = (3 - currentDay + 7) % 7 || 7 // always next Wednesday

  // Approximate next Wednesday at noon UTC to determine DST offset on that date
  const approxNextWedUTC = new Date(now)
  approxNextWedUTC.setUTCDate(now.getUTCDate() + daysToAdd)
  approxNextWedUTC.setUTCHours(12, 0, 0, 0)

  // Madrid UTC offset (ms) on next Wednesday (handles DST correctly)
  const madridOnNextWed = new Date(
    approxNextWedUTC.toLocaleString('en-US', { timeZone: MADRID_TZ })
  )
  const madridOffsetMs = madridOnNextWed.getTime() - approxNextWedUTC.getTime()
  const madridOffsetHours = Math.round(madridOffsetMs / 3_600_000) // 1 (CET) or 2 (CEST)

  // Next Wednesday date components in Madrid
  const nextWedMadrid = new Date(madridNow)
  nextWedMadrid.setDate(madridNow.getDate() + daysToAdd)
  const y = nextWedMadrid.getFullYear()
  const m = String(nextWedMadrid.getMonth() + 1).padStart(2, '0')
  const d = String(nextWedMadrid.getDate()).padStart(2, '0')

  // 22:00 Madrid = (22 - offset) UTC
  const utcHour = 22 - madridOffsetHours
  return `${y}-${m}-${d}T${String(utcHour).padStart(2, '0')}:00:00.000Z`
}

export async function GET(request: Request) {
  // Vercel sends: Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only execute when Madrid clock shows 22:xx
  const madridHour = getMadridHour()
  if (madridHour !== 22) {
    return NextResponse.json({
      skipped: true,
      reason: `Madrid hour is ${madridHour}, not 22`,
    })
  }

  const startTime = getNextWednesdayAt22UTC()

  const supabase = getAdminClient()

  // Avoid duplicates: check if an event already exists for next Wednesday
  const windowStart = startTime.replace('T22', 'T00').slice(0, 10) + 'T00:00:00.000Z'
  const windowEnd   = startTime.replace('T22', 'T00').slice(0, 10) + 'T23:59:59.000Z'

  const { data: existing } = await supabase
    .from('events')
    .select('id')
    .gte('start_time', windowStart)
    .lte('start_time', windowEnd)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ skipped: true, reason: 'Event already exists for this Wednesday' })
  }

  const { error } = await supabase.from('events').insert({
    title: 'Mixing',
    start_time: startTime,
    max_spots: COURTS * PLAYERS_PER_COURT,
    rounds: ROUNDS,
    duration_minutes: DURATION_MINUTES,
    created_by: CREATED_BY,
    status: 'open',
  })

  if (error) {
    console.error('Cron error creating event:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: players } = await supabase
    .from('profiles')
    .select('id')
    .eq('is_guest', false)

  const formattedDate = new Intl.DateTimeFormat('es-ES', {
    timeZone: MADRID_TZ,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(startTime))

  await sendPushToUsers((players ?? []).map(p => p.id), {
    title: 'Nuevo evento disponible',
    body: `"Mixing" el ${formattedDate} — ¡apúntate!`,
    url: '/dashboard',
  }).catch(console.error)

  return NextResponse.json({ created: true, start_time: startTime })
}
