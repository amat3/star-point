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
  const { data: match } = await supabase.from('matches').select('creator_id, status').eq('id', matchId).single()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (!match || !profile) {
    return { success: false, error: 'No se encontró el partido o el usuario' }
  }

  // Verificar que el partido esté pendiente o en disputa
  if (match.status !== 'pending' && match.status !== 'disputed') {
    return { success: false, error: 'Solo se pueden eliminar partidos pendientes o en disputa.' }
  }

  const isAdmin = profile.role === 'admin'
  const isCreator = match.creator_id === user.id

  if (!isAdmin && !isCreator) {
    return { success: false, error: 'No tienes permiso para eliminar este partido' }
  }

  // Intentar borrado como Admin (Service Role) si es necesario y posible
  if (isAdmin && !isCreator) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Falta SUPABASE_SERVICE_ROLE_KEY para borrar como admin')
      return { success: false, error: 'Configuración incompleta: Falta la clave de servicio (Service Role Key). Pídela al desarrollador.' }
    }

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
    
    // Usamos count para verificar si realmente se borró
    const { error, count } = await adminSupabase.from('matches').delete({ count: 'exact' }).eq('id', matchId)
    
    if (error) {
      console.error('❌ Error eliminando (Admin):', error)
      return { success: false, error: `Error DB: ${error.message}` }
    }

    if (count === 0) {
      return { success: false, error: 'No se encontró el partido o ya fue eliminado.' }
    }
    
    revalidatePath('/dashboard')
    return { success: true }
  }

  // Borrado estándar (User RLS) - Solo si es creador (ya validado arriba, pero por seguridad)
  const { error, count } = await supabase.from('matches').delete({ count: 'exact' }).eq('id', matchId)

  if (error) {
    console.error('❌ Error eliminando partido:', error)
    return { success: false, error: error.message }
  }

  if (count === 0) {
     return { success: false, error: 'No se pudo eliminar. Verifica permisos RLS.' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
