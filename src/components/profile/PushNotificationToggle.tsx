'use client'

import { useEffect, useState } from 'react'
import Switch from '@/components/atoms/Switch'
import SettingRow from '@/components/molecules/SettingRow'
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
    return <SettingRow icon={<BellOff />} title="Notificaciones" description="Comprobando…" control={<Switch aria-label="Notificaciones" disabled checked={false} />} />
  }

  if (status === 'unsupported') {
    const iosNotInstalled = isIOSDevice() && !isStandaloneMode()
    return (
      <SettingRow
        icon={<BellOff />}
        title="Notificaciones"
        description={
          iosNotInstalled
            ? 'En iPhone, instala primero StarPoint en la pantalla de inicio para poder activar las notificaciones.'
            : 'Tu navegador no soporta notificaciones push.'
        }
        control={null}
      />
    )
  }

  if (status === 'denied') {
    return (
      <SettingRow
        icon={<BellOff />}
        title="Notificaciones"
        description="Has bloqueado las notificaciones para StarPoint. Actívalas en los ajustes del navegador para recibir avisos."
        control={null}
      />
    )
  }

  const isOn = status === 'on'

  return (
    <SettingRow
      icon={isOn ? <Bell /> : <BellOff />}
      title="Notificaciones"
      description={isOn ? 'Activadas' : 'Desactivadas'}
      control={
        <Switch
          aria-label="Notificaciones"
          checked={isOn}
          disabled={busy}
          onCheckedChange={(checked) => (checked ? enable() : disable())}
        />
      }
    />
  )
}
