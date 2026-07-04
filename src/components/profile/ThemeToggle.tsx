'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-9 w-full max-w-50 rounded-full bg-gray-100 dark:bg-gray-700/50 animate-pulse" />
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <div className="flex items-center space-x-2 bg-white/50 dark:bg-gray-800/50 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 w-fit">
      {isDark ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-gray-500" />}
      <div className="flex items-center space-x-2">
        <Switch
          id="theme-mode"
          checked={isDark}
          onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
          className="scale-75 data-[state=checked]:bg-primary"
        />
        <Label htmlFor="theme-mode" className="text-xs font-medium cursor-pointer min-w-15">
          {isDark ? 'Tema Oscuro' : 'Tema Claro'}
        </Label>
      </div>
    </div>
  )
}
