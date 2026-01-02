'use client'

import { useState } from 'react'
import { PlusCircle, Shuffle, Sword } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NewMatchForm } from './forms/new-match-form'
import { NewMixingForm } from './forms/new-mixing-form'

export function MatchesActions() {
  const [showMatchForm, setShowMatchForm] = useState(false)
  const [showMixingForm, setShowMixingForm] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="flex shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 px-3 sm:px-4 gap-2 bg-gradient-to-br from-primary via-primary/90 to-blue-600 dark:from-primary/80 dark:to-blue-900 text-white border-none">
            <PlusCircle className="h-5 w-5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Nuevo Resultado</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 p-2">
          <DropdownMenuItem onClick={() => setShowMatchForm(true)} className="cursor-pointer gap-3 p-3 text-base font-medium">
            <Sword className="h-5 w-5 text-secondary" />
            <span>Nuevo Partido</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowMixingForm(true)} className="cursor-pointer gap-3 p-3 text-base font-medium">
            <Shuffle className="h-5 w-5 text-primary" />
            <span>Nuevo Mixing</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <NewMatchForm 
        open={showMatchForm} 
        onOpenChange={setShowMatchForm} 
        trigger={<span className="hidden" />} 
      />

      <NewMixingForm 
        open={showMixingForm} 
        onOpenChange={setShowMixingForm} 
        trigger={<span className="hidden" />} 
      />
    </>
  )
}
