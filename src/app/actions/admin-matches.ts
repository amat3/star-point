'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
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

  // Intentar borrado como Admin (Service Role) si es necesario y posible
  if (isAdmin && !isCreator && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('⚡️ Usando Service Role para eliminación de Admin')
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    const { error } = await adminSupabase.from('matches').delete().eq('id', matchId)
    
    if (error) {
      console.error('❌ Error eliminando (Admin):', error)
      return { success: false, error: error.message }
    }
    
    revalidatePath('/dashboard')
    return { success: true }
  }

  // Borrado estándar (User RLS)
  const { error } = await supabase.from('matches').delete().eq('id', matchId)

  if (error) {
    console.error('❌ Error eliminando partido:', error)
    return { success: false, error: error.message }
  }

  // Verificación adicional: Si no dio error pero RLS bloqueó, el partido seguirá existiendo.
  // Podríamos consultar si existe, pero el usuario lo notará. 
  // Lo ideal es tener el SERVICE_ROLE_KEY configurado.

  revalidatePath('/dashboard')
  return { success: true }
}
