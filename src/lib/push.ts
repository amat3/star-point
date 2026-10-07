import webpush from 'web-push'
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
