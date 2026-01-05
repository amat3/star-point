import { createClient } from '@/utils/supabase/server'
import HomeClient from './home-client'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const destination = user ? '/dashboard' : '/login'

  return <HomeClient destination={destination} />
}