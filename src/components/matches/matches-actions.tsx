'use client'

import { useState } from 'react'
import { Shuffle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NewMixingForm } from './forms/new-mixing-form'

export function MatchesActions() {
  const [showMixingForm, setShowMixingForm] = useState(false)

  return (
    <>
      <Button
        onClick={() => setShowMixingForm(true)}
        className="flex shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 px-3 sm:px-4 gap-2 bg-linear-to-br from-primary via-primary/90 to-blue-600 dark:from-primary/80 dark:to-blue-900 text-white border-none"
      >
        <Shuffle className="h-5 w-5 sm:h-4 sm:w-4" />
        <span className="hidden sm:inline">Nuevo Resultado</span>
      </Button>

      <NewMixingForm
        open={showMixingForm}
        onOpenChange={setShowMixingForm}
        trigger={<span className="hidden" />}
      />
    </>
  )
}
