'use client'

import { Shuffle } from 'lucide-react'
import Switch from '@/components/atoms/Switch'
import SettingRow from '@/components/molecules/SettingRow'

interface AutoDrawSettingProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

/** Switch of the event forms: whether the draw makes itself 3 hours before the start (`events.auto_draw`). */
export default function AutoDrawSetting({ checked, onCheckedChange }: AutoDrawSettingProps) {
  return (
    <SettingRow
      icon={<Shuffle />}
      title="Sorteo automático"
      description={checked ? 'Se hace solo 3 horas antes del inicio' : 'Lo haces tú desde el generador'}
      control={<Switch aria-label="Sorteo automático" checked={checked} onCheckedChange={onCheckedChange} />}
    />
  )
}
