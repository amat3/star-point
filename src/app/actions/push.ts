'use server'

import { createClient } from '@/utils/supabase/server'

type SubscriptionPayload = {
  endpoint: string
  p256dh: string
  auth: string
}

export async function savePushSubscription(subscription: SubscriptionPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      { user_id: user.id, endpoint: subscription.endpoint, p256dh: subscription.p256dh, auth: subscription.auth },
      { onConflict: 'user_id,endpoint' }
    )

  if (error) throw new Error(error.message)
  return { success: true }
}

export async function deletePushSubscription(endpoint: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)

  if (error) throw new Error(error.message)
  return { success: true }
}
