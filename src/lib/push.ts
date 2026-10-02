import webpush from 'web-push'
import { getAdminClient } from '@/utils/supabase/admin'

type PushPayload = {
  title: string
  body: string
  url?: string
}

// Eventos de prueba (is_test): en vez de omitir el push por completo, se
// restringe a esta audiencia reducida para poder verificar el flujo sin
// molestar al resto del club. Juanan (admin) + Paula (player).
export const TEST_PUSH_AUDIENCE = [
  'cb288b22-8fdb-4744-a421-c05646c37454',
  '733d4e30-e5c4-41b9-bbc8-b1f0509f8bba',
]

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

// Fire-and-forget: cualquier código que inserte en `notifications` (o quiera
// avisar de un evento sin fila en esa tabla, como un nuevo mixing publicado)
// debe llamar a esto explícitamente — no hay trigger genérico automático.
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (!userIds.length) return
  // Kill switch for testing: with PUSH_DISABLED=true nothing is sent
  if (process.env.PUSH_DISABLED === 'true') return
  if (!ensureVapidConfigured()) return

  const adminSupabase = getAdminClient()
  const { data: subs } = await adminSupabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', userIds)

  if (!subs?.length) return

  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode
      if (statusCode === 404 || statusCode === 410) {
        await adminSupabase.from('push_subscriptions').delete().eq('id', sub.id)
      } else {
        console.error('Push send failed:', err)
      }
    }
  }))
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  return sendPushToUsers([userId], payload)
}
