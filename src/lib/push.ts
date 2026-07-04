import webpush from 'web-push'
import { getAdminClient } from '@/utils/supabase/admin'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

type PushPayload = {
  title: string
  body: string
  url?: string
}

// Fire-and-forget: cualquier código que inserte en `notifications` debe llamar
// esto explícitamente (no hay trigger genérico que envíe push automáticamente).
export async function sendPushToUser(userId: string, payload: PushPayload) {
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
