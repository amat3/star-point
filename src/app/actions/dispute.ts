'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function disputeMatch(matchId: string) {
  console.log('🛡️ Impugnando partido:', matchId)
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No estás autenticado' }

  // Verificar que el partido existe y NO está confirmado
  const { data: match } = await supabase.from('matches').select('status').eq('id', matchId).single()
  
  if (!match) return { success: false, error: 'Partido no encontrado' }
  if (match.status === 'confirmed') return { success: false, error: 'No se puede impugnar un partido ya confirmado' }

  const { error } = await supabase.from('matches').update({ status: 'disputed' }).eq('id', matchId)

  if (error) {
    console.error('❌ Error al impugnar:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
