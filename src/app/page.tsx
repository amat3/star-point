import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const destination = user ? '/dashboard' : '/login'

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 animate-in fade-in duration-1000">
      <div className="text-center space-y-6 max-w-2xl transform transition-all duration-700 hover:scale-105">
        <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tight">
          Star<span className="text-lime-500">Point</span>
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-xl sm:text-2xl">
          La app de Padel & Risas
        </p>
        <div className="pt-8">
          <Link href={destination}>
            <Button size="lg" className="bg-lime-500 hover:bg-lime-600 text-white px-8 py-6 text-lg shadow-lg hover:shadow-lime-500/50 transition-all duration-300">
              Entrar
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}