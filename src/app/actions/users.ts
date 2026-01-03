'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

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
    throw new Error(error.message)
  }

  revalidatePath('/dashboard')
  revalidatePath('/profile')
  return { success: true }
}
