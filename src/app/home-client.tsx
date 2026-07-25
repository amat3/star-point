'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ThinkingOrb } from 'thinking-orbs'

interface HomeClientProps {
  destination: string
}

export default function HomeClient({ destination }: HomeClientProps) {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push(destination)
    }, 2000)

    return () => clearTimeout(timer)
  }, [destination, router])

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-8 animate-in fade-in duration-1000">
      <div className="text-center space-y-6 max-w-2xl transform transition-all duration-700 hover:scale-105">
        <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Star<span className="text-lime-500">Point</span>
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-xl sm:text-2xl">
          La app de Padel & Risas
        </p>
        <div className="pt-8 flex justify-center">
          <ThinkingOrb state="composing" size={64} theme="auto" aria-label="Cargando…" />
        </div>
      </div>
    </div>
  )
}
