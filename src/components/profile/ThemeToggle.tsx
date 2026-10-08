'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import Switch from '@/components/atoms/Switch'
import SettingRow from '@/components/molecules/SettingRow'
import { useHasMounted } from '@/lib/use-has-mounted'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useHasMounted()
  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <SettingRow
      icon={isDark ? <Moon /> : <Sun />}
      title="Tema oscuro"
      description={isDark ? 'Activado' : 'Desactivado'}
      control={
        <Switch
          aria-label="Tema oscuro"
          checked={isDark}
          disabled={!mounted}
          onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
        />
      }
    />
  )
}
