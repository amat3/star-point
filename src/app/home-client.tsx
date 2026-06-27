'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
    <div className="flex flex-col items-center justify-center flex-1 select-none animate-in fade-in duration-700">
      <div className="flex flex-col items-center gap-2">
        <span className="text-secondary text-5xl leading-none animate-in zoom-in-50 duration-500">
          ★
        </span>
        <h1 className="font-display text-[clamp(4rem,18vw,8rem)] leading-none text-primary dark:text-primary animate-in slide-in-from-bottom-3 duration-500 delay-150">
          STARPOINT
        </h1>
        <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground animate-in fade-in duration-700 delay-300">
          Liga Pádel
        </p>
      </div>
      <div className="mt-16 flex items-center gap-3 animate-in fade-in duration-700 delay-500">
        <div className="h-px w-8 bg-primary/20" />
        <div className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" />
        <div className="h-px w-8 bg-primary/20" />
      </div>
    </div>
  )
}
