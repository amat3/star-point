'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { isStandaloneMode, isIOSDevice, isTouchDevice } from '@/lib/utils'

const DISMISS_KEY = 'pwa-reinstall-dismissed-v1'

export function InstallBanner() {
  const [state, setState] = useState({ visible: false, isIOS: false })

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY)

    if (isTouchDevice() && !isStandaloneMode() && !dismissed) {
      setState({ visible: true, isIOS: isIOSDevice() })
    }
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setState((s) => ({ ...s, visible: false }))
  }

  if (!state.visible) return null

  return (
    <div className="fixed bottom-3 inset-x-3 sm:inset-x-auto sm:right-4 sm:max-w-sm z-50 rounded-xl border border-primary/20 bg-white dark:bg-gray-800 shadow-lg p-3 flex items-start gap-3">
      <div className="shrink-0 text-xl leading-none mt-0.5">📲</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">Reinstala StarPoint</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
          {state.isIOS
            ? 'Borra el icono actual y vuelve a pulsar Compartir → "Añadir a pantalla de inicio" para abrir la app a pantalla completa.'
            : 'Borra el icono actual y usa el menú ⋮ → "Instalar app" para abrir StarPoint a pantalla completa.'}
        </p>
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 text-muted-foreground hover:text-gray-700 dark:hover:text-gray-200"
        aria-label="Cerrar aviso"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
