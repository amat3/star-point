'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Eye, Shield } from 'lucide-react'

export function ViewToggle() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const isAdminView = searchParams.get('view') === 'admin'

  const toggleView = (checked: boolean) => {
    const newParams = new URLSearchParams(searchParams.toString())
    if (checked) {
      newParams.set('view', 'admin')
    } else {
      newParams.delete('view')
    }
    router.push(`?${newParams.toString()}`)
  }

  return (
    <div className="flex items-center space-x-2 bg-white/50 dark:bg-gray-800/50 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700">
      {isAdminView ? <Shield className="h-4 w-4 text-primary" /> : <Eye className="h-4 w-4 text-gray-500" />}
      <div className="flex items-center space-x-2">
        <Switch
          id="view-mode"
          checked={isAdminView}
          onCheckedChange={toggleView}
          className="scale-75 data-[state=checked]:bg-primary"
        />
        <Label htmlFor="view-mode" className="text-xs font-medium cursor-pointer min-w-15">
          {isAdminView ? 'Vista Admin' : 'Vista Player'}
        </Label>
      </div>
    </div>
  )
}
