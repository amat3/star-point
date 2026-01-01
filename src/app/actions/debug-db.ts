'use server'
import { createClient } from '@/utils/supabase/server'

export async function checkSchema() {
  const supabase = await createClient()
  
  const { data: profilesCols, error: pError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1)

  const { data: matchesCols, error: mError } = await supabase
    .from('matches')
    .select('*')
    .limit(1)

  return {
    profiles: profilesCols ? Object.keys(profilesCols[0] || {}) : [],
    matches: matchesCols ? Object.keys(matchesCols[0] || {}) : [],
    pError,
    mError
  }
}
