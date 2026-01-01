'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteMatch(matchId: string) {
  console.log('🗑️ Eliminando partido:', matchId)
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'No estás autenticado' }
  }

  // Verificar permisos (Admin o Creador)
  // 1. Obtener partido y perfil del usuario
  const { data: match } = await supabase.from('matches').select('creator_id').eq('id', matchId).single()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (!match || !profile) {
    return { success: false, error: 'No se encontró el partido o el usuario' }
  }

  const isAdmin = profile.role === 'admin'
  const isCreator = match.creator_id === user.id

  if (!isAdmin && !isCreator) {
    return { success: false, error: 'No tienes permiso para eliminar este partido' }
  }

  const { error } = await supabase.from('matches').delete().eq('id', matchId)

  if (error) {
    console.error('❌ Error eliminando partido:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
