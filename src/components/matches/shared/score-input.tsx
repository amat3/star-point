'use client'

import { Plus, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FormMessage } from '@/components/ui/form'

interface ScoreInputProps {
  name: string
  form: any
  labelColor: string
  min?: number
  max?: number
}

export function ScoreInput({ 
  name, 
  form, 
  labelColor,
  min = 0,
  max = 7
}: ScoreInputProps) {
  const value = form.watch(name) ?? 0

  const updateValue = (delta: number) => {
    const newValue = Math.max(min, Math.min(max, (Number(value) || 0) + delta))
    form.setValue(name, newValue, { shouldValidate: true })
  }

  return (
    <div className="flex flex-col items-center space-y-1">
      <span className={cn("text-xs font-bold", labelColor)}>
        {name.endsWith('_a') || name === 'games_a' ? 'A' : 'B'}
      </span>
      <div className="flex items-center border rounded-md overflow-hidden bg-white dark:bg-gray-950">
        <button
          type="button"
          onClick={() => updateValue(-1)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
        </button>
        <div className="w-8 sm:w-10 h-8 flex items-center justify-center border-x text-sm font-medium">
          {value}
        </div>
        <button
          type="button"
          onClick={() => updateValue(1)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
        </button>
      </div>
      <FormMessage className="text-[10px] sm:text-xs" />
    </div>
  )
}
