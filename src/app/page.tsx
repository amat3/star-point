import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const destination = user ? '/dashboard' : '/login'

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-8 animate-in fade-in duration-1000">
      <div className="text-center space-y-6 max-w-2xl transform transition-all duration-700 hover:scale-105">
        <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tight">
          Star<span className="text-secondary">Point</span>
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-xl sm:text-2xl">
          La app de Padel & Risas
        </p>
        <div className="pt-8">
          <Link href={destination}>
            <Button size="lg" className="px-8 py-6 text-lg shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 bg-gradient-to-br from-primary via-primary/90 to-blue-600 dark:from-primary/80 dark:to-blue-900 text-white border-none">
              Entrar
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}