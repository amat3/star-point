'use client'

import styled from '@emotion/styled'
import Button from '@/components/atoms/Button'
import { MessageCircle } from 'lucide-react'
import { MixingEvent } from '@/types/events'

interface ShareEventButtonProps {
  event: MixingEvent
}

export function ShareEventButton({ event }: ShareEventButtonProps) {
  const handleShare = async () => {
    // 1. Constantes
    // 2. Formatear datos
    const date = new Date(event.start_time).toLocaleDateString('es-ES', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long',
        timeZone: 'Europe/Madrid',
    }) // "sábado, 10 de enero"
    
    // Capitalize first letter
    const formattedDate = date.charAt(0).toUpperCase() + date.slice(1)
    
    const time = new Date(event.start_time).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Madrid',
    })
    
    const url = `${window.location.origin}`

    // 3. Construir mensaje
    // 🎾 ¡NUEVO MIXING! 🎾
    //
    // 📅 Fecha: Miércoles, 21 de Enero
    // 🕗 Hora: 20:00h
    // 👥 Plazas: 12 disponibles
    //
    // Reserva tu plaza aquí: 👇👇👇
    // https://...

    const message = [
        `🎾 ¡NUEVO MIXING! 🎾`,
        ``,
        `📅 Fecha: ${formattedDate}`,
        `🕗 Hora: ${time}h`,
        `👥 Plazas: ${event.max_spots} disponibles`,
        ``,
        `Reserva tu plaza aquí: 👇👇👇`,
        `${url}`
    ].join('\n')

    // 4. Intentar usar Web Share API (Móvil nativo)
    if (navigator.share) {
        try {
            await navigator.share({
                title: event.title,
                text: message
            })
            return
        } catch (error) {
            console.log('Error sharing:', error)
        }
    }

    // 5. Fallback a WhatsApp Web (api.whatsapp.com es más fiable para emojis que wa.me)
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <ShareButton type="button" onClick={handleShare}>
      <MessageCircle />
      Notificar al grupo
    </ShareButton>
  )
}

// WhatsApp green: a brand color, so it stays the same in light and dark.
const ShareButton = styled(Button)`
  width: 100%;
  background: #25d366;
  color: #fff;
  border-color: transparent;

  &:hover {
    background: #128c7e;
    opacity: 1;
  }
`
