'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Eye, Shield } from 'lucide-react'

export function ViewToggle() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const isPlayerView = searchParams.get('view') === 'player'

  const toggleView = (checked: boolean) => {
    // If checked (Admin View), remove param. If unchecked (Player View), add param.
    // Wait, let's make the switch represent "Admin Mode".
    // ON = Admin Mode (default), OFF = Player Mode
    
    // So if isPlayerView is true, the switch is OFF.
    // If we turn it ON, we remove the param.
    
    // UI: "Vista Admin" [Switch]
    
    const newParams = new URLSearchParams(searchParams.toString())
    
    if (checked) {
        // Switch turned ON -> Admin Mode
        newParams.delete('view')
    } else {
        // Switch turned OFF -> Player Mode
        newParams.set('view', 'player')
    }
    
    router.push(`?${newParams.toString()}`)
  }

  return (
    <div className="flex items-center space-x-2 bg-white/50 dark:bg-gray-800/50 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700">
      {isPlayerView ? <Eye className="h-4 w-4 text-gray-500" /> : <Shield className="h-4 w-4 text-primary" />}
      <div className="flex items-center space-x-2">
        <Switch 
            id="view-mode" 
            checked={!isPlayerView} 
            onCheckedChange={toggleView}
            className="scale-75 data-[state=checked]:bg-primary"
        />
        <Label htmlFor="view-mode" className="text-xs font-medium cursor-pointer min-w-[60px]">
            {isPlayerView ? 'Vista Player' : 'Vista Admin'}
        </Label>
      </div>
    </div>
  )
}
