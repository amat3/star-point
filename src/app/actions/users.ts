'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export async function getPlayersRanking() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Requiere admin')

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, rating, matches_played, court_position, gender')
    .eq('is_guest', false)
    .order('full_name', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

const profileSchema = z.object({
  full_name: z.string().min(1, 'El nombre es obligatorio'),
  gender: z.enum(['masculino', 'femenino', 'otro']).optional(),
  preferred_hand: z.enum(['diestro', 'zurdo', 'ambidiestro']).optional(),
  court_position: z.enum(['reves', 'drive', 'ambos']).optional(),
})

export async function updateProfile(data: z.infer<typeof profileSchema>) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('No autorizado')
  }

  const result = profileSchema.safeParse(data)
  if (!result.success) {
    throw new Error('Datos inválidos')
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: data.full_name,
      gender: data.gender,
      preferred_hand: data.preferred_hand,
      court_position: data.court_position,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    if (error.message.includes('profiles_full_name_unique')) {
      throw new Error('Ese nombre ya está en uso. Elige otro.')
    }
    throw new Error(error.message)
  }

  revalidatePath('/dashboard')
  revalidatePath('/profile')
  return { success: true }
}

export async function updateAvatarUrl(url: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: url })
    .eq('id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  revalidatePath('/profile')
  return { success: true }
}
