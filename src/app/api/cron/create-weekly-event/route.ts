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

// Hora de inicio real de los partidos (Madrid) — distinta de la ventana en la
// que se PUBLICA el evento (22:00-22:59 Madrid, ver `getMadridHour` más abajo).
const EVENT_START_HOUR_MADRID = 20

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

// Offset de Madrid respecto a UTC (horas, +1 CET o +2 CEST) para una fecha dada.
// Lee el offset directamente vía Intl en vez de reinterpretar un string
// formateado como si fuera hora local del runtime — ese truco alternativo da
// resultados incorrectos precisamente cuando el runtime ya está en Europe/Madrid
// (no es el caso de Vercel, que corre en UTC, pero sí de una ejecución local).
function getMadridOffsetHoursForDate(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: MADRID_TZ, timeZoneName: 'shortOffset' }).formatToParts(date)
  const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+0'
  const match = tzPart.match(/GMT([+-]\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

// Componentes de fecha (año/mes/día/día-de-semana) tal como se ven en Madrid,
// leídos directamente vía Intl sin reinterpretar strings en la zona del runtime.
function getMadridDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MADRID_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    weekdayIndex: WEEKDAY_INDEX[get('weekday')] ?? 0,
  }
}

// Computes the UTC ISO string for "next Wednesday at EVENT_START_HOUR_MADRID:00 Madrid",
// correctly accounting for DST on that specific date.
function getNextWednesdayMatchStartUTC(): string {
  const now = new Date()

  const { weekdayIndex: currentDay } = getMadridDateParts(now)
  const daysToAdd = (3 - currentDay + 7) % 7 || 7 // always next Wednesday

  // Próximo miércoles a mediodía UTC, solo para fijar la fecha y determinar el
  // offset (CET/CEST) correcto en ese día concreto.
  const approxNextWedUTC = new Date(now)
  approxNextWedUTC.setUTCDate(now.getUTCDate() + daysToAdd)
  approxNextWedUTC.setUTCHours(12, 0, 0, 0)

  const { year: y, month: m, day: d } = getMadridDateParts(approxNextWedUTC)
  const offsetHours = getMadridOffsetHoursForDate(approxNextWedUTC)

  // EVENT_START_HOUR_MADRID:00 Madrid = (EVENT_START_HOUR_MADRID - offset) UTC
  const utcHour = EVENT_START_HOUR_MADRID - offsetHours
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(utcHour).padStart(2, '0')}:00:00.000Z`
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

  const startTime = getNextWednesdayMatchStartUTC()

  const supabase = getAdminClient()

  // Avoid duplicates: check if an event already exists for next Wednesday
  const datePart = startTime.slice(0, 10) // 'YYYY-MM-DD'
  const windowStart = `${datePart}T00:00:00.000Z`
  const windowEnd = `${datePart}T23:59:59.000Z`

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
