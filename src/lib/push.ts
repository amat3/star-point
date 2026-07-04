import webpush from 'web-push'
import { getAdminClient } from '@/utils/supabase/admin'

type PushPayload = {
  title: string
  body: string
  url?: string
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

// Fire-and-forget: cualquier código que inserte en `notifications` debe llamar
// esto explícitamente (no hay trigger genérico que envíe push automáticamente).
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!ensureVapidConfigured()) return

  const adminSupabase = getAdminClient()
  const { data: subs } = await adminSupabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)

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
