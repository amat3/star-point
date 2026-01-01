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
import { NewMatchForm } from './new-match-form'
import { NewMixingForm } from './new-mixing-form'

export function MatchesActions() {
  const [showMatchForm, setShowMatchForm] = useState(false)
  const [showMixingForm, setShowMixingForm] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="flex bg-lime-500 hover:bg-lime-600 text-white shadow-lg shadow-lime-500/30 hover:shadow-lime-500/50 transition-all duration-300 px-3 sm:px-4 gap-2">
            <PlusCircle className="h-5 w-5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Nuevo Resultado</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setShowMatchForm(true)} className="cursor-pointer gap-2">
            <Sword className="h-4 w-4 text-lime-600" />
            <span>Nuevo Partido</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowMixingForm(true)} className="cursor-pointer gap-2">
            <Shuffle className="h-4 w-4 text-indigo-500" />
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
