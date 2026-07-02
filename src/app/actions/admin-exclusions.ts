'use server'

import { createClient } from '@/utils/supabase/server'
import { getAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { ExclusionRule } from '@/lib/mixing-algorithm'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Requiere admin')
  return user.id
}

export interface ExclusionRow {
  id: string
  player_a: string
  player_b: string
  type: 'no_partner' | 'no_opponent' | 'no_contact'
  note: string | null
  player_a_name: string
  player_b_name: string
}

export async function getExclusions(): Promise<ExclusionRow[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('mixing_exclusions')
    .select('id, player_a, player_b, type, note, profiles_a:player_a(full_name), profiles_b:player_b(full_name)')
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    id: row.id as string,
    player_a: row.player_a as string,
    player_b: row.player_b as string,
    type: row.type as 'no_partner' | 'no_opponent' | 'no_contact',
    note: row.note as string | null,
    player_a_name: (Array.isArray(row.profiles_a) ? row.profiles_a[0]?.full_name : row.profiles_a?.full_name) ?? row.player_a,
    player_b_name: (Array.isArray(row.profiles_b) ? row.profiles_b[0]?.full_name : row.profiles_b?.full_name) ?? row.player_b,
  }))
}

export async function getExclusionRules(): Promise<ExclusionRule[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('mixing_exclusions')
    .select('player_a, player_b, type')

  return (data ?? []).map((row: { player_a: string; player_b: string; type: 'no_partner' | 'no_opponent' | 'no_contact' }) => ({
    playerA: row.player_a,
    playerB: row.player_b,
    type: row.type,
  }))
}

export async function addExclusion(
  playerA: string,
  playerB: string,
  type: 'no_partner' | 'no_opponent' | 'no_contact',
  note?: string
) {
  const adminId = await assertAdmin()
  const adminSupabase = getAdminClient()

  const { error } = await adminSupabase.from('mixing_exclusions').insert({
    player_a: playerA,
    player_b: playerB,
    type,
    note: note || null,
    created_by: adminId,
  })

  if (error) {
    if (error.code === '23505') throw new Error('Esta exclusión ya existe')
    throw new Error(error.message)
  }

  revalidatePath('/admin/exclusions')
  return { success: true }
}

export async function removeExclusion(id: string) {
  await assertAdmin()
  const adminSupabase = getAdminClient()

  const { error } = await adminSupabase.from('mixing_exclusions').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/exclusions')
  return { success: true }
}
