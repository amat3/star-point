import webpush from 'web-push'
import { after } from 'next/server'
import { getAdminClient } from '@/utils/supabase/admin'

type PushPayload = {
  title: string
  body: string
  url?: string
}

// Eventos de prueba (is_test): en vez de omitir el push por completo, se
// restringe a una audiencia reducida para poder verificar el flujo sin
// molestar al resto del grupo. Sus ids vienen de TEST_PUSH_USER_IDS (separados
// por comas); sin la variable, un evento de prueba no avisa a nadie.
export function getTestPushAudience(): string[] {
  return (process.env.TEST_PUSH_USER_IDS ?? '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean)
}

let vapidReady = false

// setVapidDetails lanza de forma síncrona si falta cualquier valor. Se hace
// perezoso (no a nivel de módulo) para que un entorno mal configurado no
// rompa TODO lo que importe este archivo (events.ts se usa en joinEvent,
// createEvent, etc. — no solo en el flujo de push).
function ensureVapidConfigured(): boolean {
  if (vapidReady) return true

  const subject = process.env.VAPID_SUBJECT
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY

  if (!subject || !publicKey || !privateKey) {
    console.error('Push notifications no configuradas: faltan variables VAPID')
    return false
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey)
    vapidReady = true
    return true
  } catch (err) {
    console.error('Error configurando VAPID:', err)
    return false
  }
}

export type PushResult = {
  /** Registered devices of the recipients */
  devices: number
  /** Accepted by the push service (it can still not reach the device: that is up to the phone) */
  sent: number
  /** Subscriptions the push service said are gone (404/410): deleted */
  removed: number
  /** Any other error */
  failed: number
  /** Devices per push service: apple, google, mozilla… */
  services: Record<string, number>
  /** Status code of every non-accepted send, with how many times: { '410': 2, '403': 1 } */
  errors: Record<string, number>
}

// Which push service an endpoint belongs to, without keeping the address (it identifies the device)
function serviceOf(endpoint: string) {
  try {
    const host = new URL(endpoint).host
    if (host.includes('apple')) return 'apple'
    if (host.includes('googleapis') || host.includes('google')) return 'google'
    if (host.includes('mozilla')) return 'mozilla'
    if (host.includes('windows') || host.includes('microsoft')) return 'microsoft'
    return host
  } catch {
    return 'invalid'
  }
}

const count = (map: Record<string, number>, key: string) => {
  map[key] = (map[key] ?? 0) + 1
}

// Sends and reports. It never throws for a failed device. It logs ONE line per call (how many devices,
// who answered what, nothing that identifies a person), so a missing notification can be explained
// from the logs instead of guessed.
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<PushResult> {
  const result: PushResult = { devices: 0, sent: 0, removed: 0, failed: 0, services: {}, errors: {} }
  if (!userIds.length) return result
  // Kill switch for testing: with PUSH_DISABLED=true nothing is sent
  if (process.env.PUSH_DISABLED === 'true') return result
  if (!ensureVapidConfigured()) return result

  const adminSupabase = getAdminClient()
  const { data: subs } = await adminSupabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', userIds)

  result.devices = subs?.length ?? 0
  if (subs?.length) {
    await Promise.all(subs.map(async (sub) => {
      const service = serviceOf(sub.endpoint)
      count(result.services, service)
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        )
        result.sent++
      } catch (err: unknown) {
        const { statusCode, body } = err as { statusCode?: number; body?: string }
        count(result.errors, `${service}:${statusCode ?? 'sin-código'}`)
        if (statusCode === 404 || statusCode === 410) {
          result.removed++
          await adminSupabase.from('push_subscriptions').delete().eq('id', sub.id)
        } else {
          result.failed++
          // The body of the push service says why (BadJwtToken, UnauthorizedRegistration…)
          console.error('Push send failed:', service, statusCode, String(body ?? err).slice(0, 200))
        }
      }
    }))
  }

  console.log('[push]', JSON.stringify({ title: payload.title, recipients: userIds.length, ...result }))
  return result
}

// To send once the response has gone out. A plain un-awaited promise is not enough on a serverless
// platform: when the response is sent the function can be frozen with the sends half done, and
// some devices never get the notification. `after` keeps the function alive until this settles.
export function sendPushAfterResponse(userIds: string[], payload: PushPayload) {
  after(() => sendPushToUsers(userIds, payload).catch(console.error))
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  return sendPushToUsers([userId], payload)
}
