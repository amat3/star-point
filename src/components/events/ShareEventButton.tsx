'use client'

import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'
import { MixingEvent } from '@/types/events'

interface ShareEventButtonProps {
  event: MixingEvent
}

export function ShareEventButton({ event }: ShareEventButtonProps) {
  const handleShare = async () => {
    // 1. Constantes
    const textBold = '*'
    const newLine = '%0A'
    
    // 2. Formatear datos
    const date = new Date(event.start_time).toLocaleDateString('es-ES', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
    }) // "sábado, 10 de enero"
    
    // Capitalize first letter
    const formattedDate = date.charAt(0).toUpperCase() + date.slice(1)
    
    const time = new Date(event.start_time).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    })
    
    const url = `${window.location.origin}/events/${event.id}`

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
    <Button 
      onClick={handleShare}
      className="bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold gap-2 w-full sm:w-auto shadow-md transition-all hover:scale-105"
    >
      <MessageCircle className="w-5 h-5" />
      Notificar al Grupo
    </Button>
  )
}
