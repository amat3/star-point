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
      <div className="flex items-center border rounded-md overflow-hidden bg-white dark:bg-gray-950 shadow-sm">
        <button
          type="button"
          onClick={() => updateValue(-1)}
          className="p-3 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:bg-gray-200 dark:active:bg-gray-700 touch-manipulation"
        >
          <Minus className="h-5 w-5 sm:h-4 sm:w-4 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="w-12 sm:w-10 h-10 sm:h-8 flex items-center justify-center border-x text-lg sm:text-sm font-bold bg-gray-50/50 dark:bg-gray-900/50">
          {value}
        </div>
        <button
          type="button"
          onClick={() => updateValue(1)}
          className="p-3 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:bg-gray-200 dark:active:bg-gray-700 touch-manipulation"
        >
          <Plus className="h-5 w-5 sm:h-4 sm:w-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
      <FormMessage className="text-[10px] sm:text-xs" />
    </div>
  )
}
