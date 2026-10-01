import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

/**
 * Guard for admin pages: only the REAL role counts (the admin/player view is
 * just a display preference). Redirects everyone else.
 */
export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/')

  return { supabase, user, profile }
}
