'use client'

import { useEffect, useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Bell, BellOff } from 'lucide-react'
import { toast } from 'sonner'
import { isIOSDevice, isStandaloneMode } from '@/lib/utils'
import { savePushSubscription, deletePushSubscription } from '@/app/actions/push'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

type Status = 'checking' | 'unsupported' | 'denied' | 'off' | 'on'

export function PushNotificationToggle() {
  const [status, setStatus] = useState<Status>('checking')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    async function check() {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window
      if (!supported) {
        setStatus('unsupported')
        return
      }
      if (Notification.permission === 'denied') {
        setStatus('denied')
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setStatus(subscription ? 'on' : 'off')
    }
    check()
  }, [])

  async function enable() {
    setBusy(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('denied')
        return
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })
      const raw = subscription.toJSON()

      await savePushSubscription({
        endpoint: raw.endpoint!,
        p256dh: raw.keys!.p256dh,
        auth: raw.keys!.auth,
      })

      setStatus('on')
      toast.success('Notificaciones activadas')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al activar notificaciones')
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await deletePushSubscription(subscription.endpoint)
        await subscription.unsubscribe()
      }
      setStatus('off')
      toast.success('Notificaciones desactivadas')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al desactivar notificaciones')
    } finally {
      setBusy(false)
    }
  }

  if (status === 'checking') {
    return <div className="h-9 w-full max-w-50 rounded-full bg-gray-100 dark:bg-gray-700/50 animate-pulse" />
  }

  if (status === 'unsupported') {
    const iosNotInstalled = isIOSDevice() && !isStandaloneMode()
    return (
      <p className="text-xs text-muted-foreground leading-snug">
        {iosNotInstalled
          ? 'En iPhone, instala primero StarPoint en la pantalla de inicio para poder activar las notificaciones.'
          : 'Tu navegador no soporta notificaciones push.'}
      </p>
    )
  }

  if (status === 'denied') {
    return (
      <p className="text-xs text-muted-foreground leading-snug">
        Has bloqueado las notificaciones para StarPoint. Actívalas en los ajustes del navegador para recibir avisos.
      </p>
    )
  }

  const isOn = status === 'on'

  return (
    <div className="flex items-center space-x-2 bg-white/50 dark:bg-gray-800/50 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 w-fit">
      {isOn ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-gray-500" />}
      <div className="flex items-center space-x-2">
        <Switch
          id="push-notifications"
          checked={isOn}
          disabled={busy}
          onCheckedChange={(checked) => (checked ? enable() : disable())}
          className="scale-75 data-[state=checked]:bg-primary"
        />
        <Label htmlFor="push-notifications" className="text-xs font-medium cursor-pointer min-w-15">
          {isOn ? 'Activadas' : 'Desactivadas'}
        </Label>
      </div>
    </div>
  )
}
