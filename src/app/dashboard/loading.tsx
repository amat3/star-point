'use client'

import { ThinkingOrb } from 'thinking-orbs'

export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-screen bg-background">
      <ThinkingOrb state="composing" size={64} theme="auto" aria-label="Cargando tu StarPoint…" />
    </div>
  )
}
